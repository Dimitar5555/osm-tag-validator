const fetch = require('node-fetch');
const fs = require('fs');
const base_url = 'https://taginfo.openstreetmap.org/api/4/key/';
const VALUES_PER_PAGE = 800;
var keys = JSON.parse(fs.readFileSync('keys.json'));
async function get_stats(key){
    console.log
    return fetch(base_url + `stats?key=${key}`);
}
async function get_values(key, page){
    return fetch(base_url + `values?key=${key}&filter=all&lang=en&sortname=count&sortorder=desc&rp=${VALUES_PER_PAGE}&qtype=&format=json_pretty&page=${page}`);
}
function check_value(value, allowed_values, non_standard_usages){
    if(allowed_values.indexOf(value)==-1){
        if(non_standard_usages[value]){
            non_standard_usages[value]++;
        }
        else{
            non_standard_usages[value] = 1;
        }
    }
}
function process_value(value, allowed_values, non_standard_usages, options={colon_split: false, semicolon_split: false}){
    if(!options.colon_split && !options.semicolon_split){
        check_value(value, allowed_values, non_standard_usages);
        return;
    }

    var values;
    if(options.colon_split){
        values = value.split('|');
    }
    else if(options.semicolon_split){
        values = value.split(';');
    }
    values.forEach(value => {
        if(options.colon_split && options.semicolon_split){
            value.split(';').forEach(part => {
                check_value(part, allowed_values, non_standard_usages);
            })
        }
        else{
            check_value(value, allowed_values, non_standard_usages);
        }
    })
}

async function process_page(key, page, allowed_values, non_standard_usages, options){
    return get_values(key, page)
    .then(res => res.json())
    .then(res => {
        console.log(`Processing page ${res.page} of ${Math.ceil(res.total/res.rp)} pages for ${key}`);
        res.data.forEach(element => {
            process_value(element.value, allowed_values, non_standard_usages, options);
        });
    });
}
function generate_keys_data(){
    var keys_copy = JSON.parse(JSON.stringify(keys));
    var res = [];

    keys_copy.sort((a, b) => a.inherit_from!==undefined && a.parent_key==undefined);
    keys_copy.forEach(item => {
        if(item.inherit_from==undefined && item.parent_key==undefined){
            //main tag
            item.subkeys = [];
            res.push(item);
        }
        else{
            //subkey
            res[res.findIndex(main_item => main_item.key==(item.parent_key || item.inherit_from))].subkeys.push(item.key);
        }
    });
    res.sort((a, b) => a.key < b.key);
    // res.forEach(key => {
    //     if(key.subkeys){
    //         key.subkeys.sort();
    //     }
    // });
    return res;
}
fs.writeFileSync('docs/keys.json', JSON.stringify(generate_keys_data()));
var detected_issues = {};
var promises = [];
keys.forEach(async key => {
    if(key.skip_validation){
        return;
    }
    if(key.inherit_from){
        var source = keys.filter(a => a.key==key.inherit_from)[0];
        key.allowed_values = source.allowed_values;
        key.colon_split = source.colon_split;
        key.semicolon_split = source.semicolon_split;
    }
    promises.push(get_stats(key.key)
    .then(res => res.json())
    .then(stats => {
        var total_pages = Math.ceil(stats.data.find(a => a.type=='all').values / VALUES_PER_PAGE);
        detected_issues[key.key] = {};
        for(let i1=1;i1<=total_pages;i1++){
            promises.push(process_page(key.key, i1, key.allowed_values, detected_issues[key.key], {colon_split: key.colon_split, semicolon_split: key.semicolon_split}));
        }
    }));
});
setTimeout(() => {
    Promise.all(promises)
    .then(() => {
        console.log('Wrote data to docs/detected_issues.json');
        fs.writeFileSync('docs/detected_issues.json', JSON.stringify(detected_issues));
    });
}, 2000);