const fetch = require('node-fetch');
const fs = require('fs');
const base_url = 'https://taginfo.openstreetmap.org/api/4/key/values?';
var tags = JSON.parse(fs.readFileSync('tags.json'));
function get_stats(key, page){
    return fetch(base_url + `key=${key}&filter=all&lang=en&sortname=count&sortorder=desc&rp=800&qtype=&format=json_pretty&page=${page}`);
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

function process_page(key, page, allowed_values, non_standard_usages, options){
    get_stats(key, page)
    .then(res => res.json())
    .then(res => {
        console.log(`Processing page ${res.page} of ${Math.ceil(res.total/res.rp)} pages for ${key}`);
        res.data.forEach(element => {
            process_value(element.value, allowed_values, non_standard_usages, options);
        });
        if(Math.ceil(res.total/res.rp)>res.page){
            process_page(key, page+1, allowed_values, non_standard_usages, options);
        }
        else{
            fs.writeFileSync(`docs/data/${key.replaceAll(':', '_')}.json`, JSON.stringify(non_standard_usages));
        }
    })
    .catch(error => {throw new Error(error);});
}

if (!fs.existsSync('docs/data/')){
    fs.mkdirSync('docs/data/', {recursive: true});
}
var tags_copy = JSON.parse(JSON.stringify(tags));
tags_copy.forEach(tag => delete tag.allowed_values)
fs.writeFileSync('docs/data/tags.json', JSON.stringify(tags_copy));
delete tags_copy;

tags.forEach(tag => {
    if(tag.inherit_from){
        var source = tags.filter(a => a.tag==tag.inherit_from)[0];
        tag.allowed_values = source.allowed_values;
        tag.colon_split = source.colon_split;
        tag.semicolon_split = source.semicolon_split;
    }
    process_page(tag.tag, 1, tag.allowed_values, {}, {colon_split: tag.colon_split, semicolon_split: tag.semicolon_split});
});
