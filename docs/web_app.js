const TRIANGLE_UP = '▲';
const TRIANGLE_DOWN = '▼';

var data = {};
var base_data = {};

function format_number(number) {
    const split = number.toString().split('').reverse();
    let to_return = '';
    let digits = split.length;
    if(digits%3 > 0) {
        for(let i=0;i<digits%3;i++) {
            to_return += split.pop();
        }
        to_return += ' ';
    }
    let counter = 0;
    while(split.length > 0) {
        to_return += split.pop();
        counter++;
        if(counter%3==0 && split.length>0) {
            to_return += ' ';
        }
    }

    return to_return;
}

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

function generate_tag_links(key, value, parent_el, fuzzy_match=false) {
    {
        const overpass_link = `https://overpass-turbo.eu/?w="${key}"${fuzzy_match?'~':'='}"${value}"+global&R`;
        const a = create_html_element('a', {href: overpass_link, target: '_blank', innerText: 'Overpass Turbo'});
        parent_el.appendChild(a);
    }
    parent_el.appendChild(document.createTextNode(' '));
    {
        const level0_link = `https://level0.osmz.ru/?url=${encodeURI('//overpass-api.de/api/interpreter?data='+encodeURI(`[out:xml][timeout:25];(nwr["${key}"${fuzzy_match?'~':'='}"${value}"];);out meta;>;out meta qt;`))}`;
        const a = create_html_element('a', {href: level0_link, target: '_blank', innerText: 'Level0'});
        parent_el.appendChild(a);
    }
    parent_el.appendChild(document.createTextNode(' '));
    {
        const taginfo_link = `https://taginfo.openstreetmap.org/tags/${key}=${value}`;
        const a = create_html_element('a', {href: taginfo_link, target: '_blank', innerText: 'Taginfo'});
        parent_el.appendChild(a);
    }
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
        var td2 = create_html_element('td', {innerText: format_number(issue[1])});
        var td3 = create_html_element('td');
        
        generate_tag_links(key, issue[0], td3, key_data.fuzzy_match);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        new_tbody.appendChild(tr);
    });
    if(sorted_issues.length==0){
        var tr = create_html_element('tr');
        var td = create_html_element('td', {innerText: `There are no elements with improper values for ${key}!`, colspan: 3, class: 'text-center'});
        tr.appendChild(td);
        new_tbody.appendChild(tr);
    }
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
}
function load_data(){
    fetch('data/keys.json')
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
        return fetch('data/detected_issues.json');
    })
    .then(res => res.json())
    .then(res => data = res)
    .then(() => generate_key_list_table());
}
function generate_row(key, as_subkey_of=false){
    var tr = create_html_element('tr');
    var td0 = create_html_element('td', {class: 'text-center'});
    if(base_data[key].subkeys && base_data[key].subkeys.length>0 && !as_subkey_of){
        var btn = create_html_element('button', {innerText: TRIANGLE_DOWN, 'data-expand-parent-key': key});
        btn.onclick = (e) => {
            e.preventDefault();
            Array.from(document.querySelectorAll(`[data-parent-key='${e.target.dataset.expandParentKey}']`))
            .forEach(element => {
                element.classList.toggle('d-none')
            });
            btn.innerText = btn.innerText==TRIANGLE_DOWN?TRIANGLE_UP:TRIANGLE_DOWN; 
        };
        td0.appendChild(btn);
    }
    else if(base_data[key].parent_key || base_data[key].subkeys && base_data[key].subkeys.length>0){
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
    if(base_data[key].parent_key || as_subkey_of || !base_data[key].subkeys){
        //if the tag does not have any children but has a parent
        total_entries = Object.keys(data[key]).reduce((total, value) => total + data[key][value], 0);
    }
    else if(base_data[key].subkeys && base_data[key].subkeys.length>0){
        //if the tag has children
        if(base_data[key].skip_validation==undefined){
            //skip parent tag if it's marked for skipping the validation step
            total_entries = Object.keys(data[key]).reduce((total, value) => total + data[key][value], 0);
        }
        //get sum of all childrens' values
        base_data[key].subkeys
        .map(subkey => {
            for(value in data[subkey]){
                total_entries += data[subkey][value];
            }
        });
    }
    else{
        //for all other cases
        total_entries = Object.keys(data[key]).reduce((total, value) => total + data[key][value], 0);
    }
    var td2 = create_html_element('td', {innerText: format_number(total_entries), class: 'text-end'});

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
    //adds last row in keys table
    var last_tr = create_html_element('tr');
    var last_td0 = create_html_element('td', {innerText: 'Total', colspan: 2, class: 'fw-bold'});
    const total_count = Object.keys(data)
    .map(key => Object.keys(data[key])
        .map(value => data[key][value])
        .reduce((total, current) => total + current, 0)
    )
    .reduce((total, current) => total + current, 0);
    var last_td1 = create_html_element('td', {innerText: format_number(total_count), class: 'fw-bold text-end'});
    last_tr.appendChild(last_td0);
    last_tr.appendChild(last_td1);
    console.log(Object.keys(data).map(key => Object.keys(data[key]).map(value => data[key][value])));
    new_tbody.appendChild(last_tr);
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody);
}
load_data();
