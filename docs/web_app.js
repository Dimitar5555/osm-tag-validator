var data = {};
function create_issues_table(key){
    var issues = data[key.replaceAll(':', '_')];
    var old_tbody = document.querySelector('#issues_table').querySelector('tbody');
    var new_tbody = document.createElement('tbody');
    var sorted_issues = Object.keys(issues).map((key) => [key, issues[key]]);
    sorted_issues.sort((a, b) => a[1]<b[1]);
    sorted_issues.forEach((issue, index) => {
        var tr = document.createElement('tr');

        var td1 = document.createElement('td');
        td1.innerText = `${key}${issue.fuzzy_match?'~':'='}${issue[0]}`;
        var td2 = document.createElement('td');
        td2.innerText = issue[1];

        var td3 = document.createElement('td');
        var a1 = document.createElement('a');
        a1.innerText = 'Overpass Turbo';
        a1.href = `https://overpass-turbo.eu/?w="${key}"${issue.fuzzy_match?'~':'='}"${issue[0]}"+global&R`;
        a1.target = '_blank';
        var query = `[out:xml][timeout:25];(nwr["${key}"${issue.fuzzy_match?'~':'='}"${issue[0]}"];);out meta;>;out meta qt;`;
        var a2 = document.createElement('a');
        a2.innerText = 'Level0';
        a2.href = `https://level0.osmz.ru/?url=${encodeURI('//overpass-api.de/api/interpreter?data='+encodeURI(query))}`;
        a2.target = '_blank';
        td3.appendChild(a1);
        td3.appendChild(document.createTextNode(' '))
        td3.appendChild(a2);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        new_tbody.appendChild(tr);
    });
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody)
}
function get_data(){
    fetch('data/tags.json')
    .then(res => res.json())
    .then(res => res.sort((a, b) => a.inherit_from > b.inherit_from || a.parent_tag > b.parent_tag))
    .then(loc_data => {
        var old_tbody1 = document.querySelector('#tags_list').querySelector('tbody');
        var new_tbody1 = document.createElement('tbody');
        var last_parent_tag;
        loc_data.forEach(tag => {
            fetch(`data/${tag.tag.replaceAll(':', '_')}.json`)
            .then(res => res.json())
            .then(res => {
                var tr = document.createElement('tr');
                var td1 = document.createElement('td');
                if(tag.inherit_from){
                    var source = data[tag.inherit_from.replaceAll(':', '_')];
                    tag.allowed_values = source.allowed_values;
                    tag.colon_split = source.colon_split;
                    tag.semicolon_split = source.semicolon_split;
                    tag.fuzzy_match = source.fuzzy_match;
                }
                if(tag.inherit_from || tag.parent_tag){
                    tr.setAttribute('data-parent-tag', last_parent_tag);
                    tr.classList.add('d-none');
                }
                else{
                    last_parent_tag = tag.tag;
                    if(loc_data.filter(a => a.inherit_from==last_parent_tag || a.parent_tag==last_parent_tag).length>0){
                        var btn = document.createElement('button');
                        btn.innerText = '+';
                        btn.setAttribute('data-expand-parent-tag', last_parent_tag);
                        btn.onclick = (e) => {
                            e.preventDefault();
                            Array.from(document.querySelectorAll(`[data-parent-tag='${e.target.dataset.expandParentTag}']`))
                            .forEach(element => {
                                element.classList.toggle('d-none')
                            });
                            btn.innerText = btn.innerText=='-'?'+':'-'; 
                        };
                        td1.appendChild(btn);
                        td1.appendChild(document.createTextNode(' '));
                    }
                }
                data[tag.tag.replaceAll(':', '_')] = res;

                var a = document.createElement('a');
                a.href = `?tag=${tag.tag}`;
                a.setAttribute('data-tag', tag.tag);
                a.innerText = tag.tag;
                a.onclick = (e) => {
                    e.preventDefault();
                    var key = e.target.dataset.tag;
                    window.history.pushState(`object or string`, document.title, `?key=${key}`);
                    create_issues_table(key);
                };
                td1.appendChild(a);
                var td2 = document.createElement('td');
                td2.innerText = Object.keys(res).reduce((total, tag) => total + res[tag], 0);
                tr.appendChild(td1);
                tr.appendChild(td2);
                new_tbody1.appendChild(tr);
            });
        });
        old_tbody1.parentNode.replaceChild(new_tbody1, old_tbody1);
    })
    .then(res => {
        Array.from(document.querySelectorAll('a'))
        .forEach(element => {
            console.log(element);
            element.addEventListener('click', (e) => {
                e.preventDefault();
                var key = e.target.dataset.tag;
                window.history.pushState(`object or string`, document.title, `?key=${key}`);
                create_issues_table(key);
            })
        })
    });
}
get_data();
