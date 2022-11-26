const fetch = require('node-fetch');
const fs = require('fs');
const base_url = 'https://taginfo.openstreetmap.org/api/4/key/';
const VALUES_PER_PAGE = 999;
const keys = JSON.parse(fs.readFileSync('keys.json'));
async function get_stats(key){
    console.log
    return fetch(base_url + `stats?key=${key}`);
}
async function get_values(key, page){
    return fetch(base_url + `values?key=${key}&filter=all&lang=en&sortname=count&sortorder=desc&rp=${VALUES_PER_PAGE}&qtype=&format=json_pretty&page=${page}`);
}
function get_key_data(key_to_find){
    return keys.find(key => key.key==key_to_find);
}
function check_value(key, value, count=false){
    var allowed_values;
    var key_data = get_key_data(key);
    if(key_data.inherit_from){
        allowed_values = get_key_data(key_data.inherit_from).allowed_values;
    }
    else{
        allowed_values = key_data.allowed_values;
    }
    if(allowed_values.indexOf(value)==-1){
        if(detected_issues[key][value]){
            detected_issues[key][value]++;
        }
        else{
            detected_issues[key][value] = (count || 1);
        }
    }
}
function process_value(key, value, count, options={colon_split: false, semicolon_split: false}){
    if(!options.colon_split && !options.semicolon_split){
        check_value(key, value, count);
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
                check_value(key, part, count);
            })
        }
        else{
            check_value(key, value, count);
        }
    })
}

async function process_page(key, page, options){
    return get_values(key, page)
    .then(res => res.json())
    .then(res => {
        console.log(`Processing page ${res.page} of ${Math.ceil(res.total/res.rp)} pages for ${key}`);
        res.data.forEach(element => {
            process_value(key, element.value, element.count, options);
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
    keys_copy.forEach(item => {
        if(item.subkeys && item.subkeys.length==0){
            delete item.subkeys;
        }
    })
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
            promises.push(process_page(key.key, i1, {colon_split: key.colon_split, semicolon_split: key.semicolon_split}));
        }
    }));
});
setTimeout(() => {
    Promise.all(promises)
    .then(() => {
        console.log('Wrote data to docs/detected_issues.json');
        fs.writeFileSync('docs/detected_issues.json', JSON.stringify(detected_issues));
    });
}, 3000);