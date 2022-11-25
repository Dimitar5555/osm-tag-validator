'use strict';
var data = {};
var base_data = {};
function create_html_element(element, attributes={}){
    var el = document.createElement(element);
    if(Object.keys(attributes).length>0){
        for(attribute in attributes){
            if(attribute=='innerText'){
                el.innerText = attributes[attribute];
                continue;
            }
            el.setAttribute(attribute, attributes[attribute]);
        }
    }
    return el;
}
function create_issues_table(key){
    var issues = data[key];
    var key_data = base_data[key];
    var old_tbody = document.querySelector('#issues_table').querySelector('tbody');
    var new_tbody = create_html_element('tbody');
    var sorted_issues = Object.keys(issues).map(value => [value, data[key][value]]);
    sorted_issues.sort((a, b) => a[1]<b[1]);
    sorted_issues.forEach((issue) => {
        var tr = create_html_element('tr');
        var td1 = create_html_element('td', {innerText: `${key}${key_data.fuzzy_match?'~':'='}${issue[0]}`});
        var td2 = create_html_element('td', {innerText: issue[1]});
        var td3 = create_html_element('td');
        
        var a1 = create_html_element('a', {
            innerText: 'Overpass Turbo',
            href: `https://overpass-turbo.eu/?w="${key}"${key_data.fuzzy_match?'~':'='}"${issue[0]}"+global&R`,
            target: '_blank'});
        var query = `[out:xml][timeout:25];(nwr["${key}"${key_data.fuzzy_match?'~':'='}"${issue[0]}"];);out meta;>;out meta qt;`;
        
        var a2 = create_html_element('a', {
            innerText: 'Level0',
            href: `https://level0.osmz.ru/?url=${encodeURI('//overpass-api.de/api/interpreter?data='+encodeURI(query))}`,
            target: '_blank'
        });
        td3.appendChild(a1);
        td3.appendChild(document.createTextNode(' '))
        td3.appendChild(a2);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        new_tbody.appendChild(tr);
    });
    if(sorted_issues.length==0){
        var tr = create_html_element('tr');
        var td = create_html_element('td', {innerText: `There are now elements with improper values for ${key}!`, colspan: 3, class: 'text-center'});
        tr.appendChild(td);
        new_tbody.appendChild(tr);
    }
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
}
function load_data(){
    fetch('keys.json')
    .then(res => res.json())
    .then(res => {
        res.forEach(key => {
            base_data[key.key] = key;
            if(key.subkeys){
                key.subkeys.forEach(subkey => {
                    base_data[subkey] = {fuzzy_match: key.fuzzy_match, parent_key: key.key};
                });
            }
        });
        return fetch('detected_issues.json');
    })
    .then(res => res.json())
    .then(res => data = res)
    .then(() => generate_key_list_table());
}
function generate_row(key, as_subkey_of=false){
    var tr = create_html_element('tr');
    var td0 = create_html_element('td', {class: 'text-center'});
    if(base_data[key].subkeys && base_data[key].subkeys.length>0 && !as_subkey_of){
        var btn = create_html_element('button', {innerText: '+', 'data-expand-parent-key': key});
        btn.onclick = (e) => {
            e.preventDefault();
            Array.from(document.querySelectorAll(`[data-parent-key='${e.target.dataset.expandParentKey}']`))
            .forEach(element => {
                element.classList.toggle('d-none')
            });
            btn.innerText = btn.innerText=='-'?'+':'-'; 
        };
        td0.appendChild(btn);
    }
    else{
        tr.classList.add('d-none');
        tr.setAttribute('data-parent-key', (base_data[key].parent_key || as_subkey_of));
    }
    var td1 = create_html_element('td');
    if((base_data[key].subkeys==undefined || base_data[key].subkeys.length==0 || as_subkey_of)){
        var a = create_html_element('a', {href: `?key=${key}`, 'data-key': key, innerText: key});
        a.onclick = (e) => {
            e.preventDefault();
            var key = e.target.dataset.key;
            window.history.pushState(`object or string`, document.title, `?key=${key}`);
            create_issues_table(key);
        };
        td1.appendChild(a);
    }
    else{
        td1.appendChild(document.createTextNode(key));
    }
    var total_entries = 0;
    if(base_data[key].parent_key || as_subkey_of){
        total_entries = Object.keys(data[key]).reduce((total, value) => total + data[key][value], 0);
    }
    else if(base_data[key].subkeys.length>0){
        if(!base_data[key].skip_validation){
            total_entries = Object.keys(data[key]).reduce((total, value) => total + data[key][value], 0);
        }
        base_data[key].subkeys
        .map(subkey => {
            for(value in data[subkey]){
                total_entries += data[subkey][value];
            }
        });
    }
    var td2 = create_html_element('td', {innerText: total_entries});

    tr.appendChild(td0);
    tr.appendChild(td1);
    tr.appendChild(td2);
    return tr;
}
function generate_key_list_table(){
    var old_tbody = document.querySelector('#tags_list').querySelector('tbody');
    var new_tbody = create_html_element('tbody');
    Object.keys(base_data).forEach(key => {
        new_tbody.appendChild(generate_row(key));
        if(base_data[key].subkeys && base_data[key].subkeys.length>0 && base_data[key].skip_validation==undefined){
            new_tbody.appendChild(generate_row(key, key));
        }
    });
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
}
load_data();