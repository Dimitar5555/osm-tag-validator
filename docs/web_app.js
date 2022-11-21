var data = {};
function create_issues_table(key){
    var issues = data[key.replaceAll(':', '_')];
    var table = document.querySelector('#issues_table');
    var old_tbody = table.querySelector('tbody');
    var new_tbody = document.createElement('tbody');
    var sorted_issues = Object.keys(issues).map((key) => [key, issues[key]]);
    sorted_issues.sort((a, b) => a[1]<b[1]);
    console.log(issues, sorted_issues);
    sorted_issues.forEach((issue, index) => {
        var tr = document.createElement('tr');

        var td1 = document.createElement('td');
        td1.innerHTML = index+1;
        var td2 = document.createElement('td');
        td2.innerHTML = issue[0];
        var td3 = document.createElement('td');
        td3.innerHTML = issue[1];

        var td4 = document.createElement('td');
        var a1 = document.createElement('a');
        a1.innerText = 'Overpass Turbo';
        a1.href = `https://overpass-turbo.eu/?w="${key}"${issue.exact_match?'=':'~'}"${issue[0]}"+global`;
        a1.target = '_blank';
        var query = `[out:xml][timeout:25];(nwr["${key}"${issue.exact_match?'=':'~'}"${issue[0]}"];);out meta;>;out meta qt;`;
        var a2 = document.createElement('a');
        a2.innerText = 'Level0';
        a2.href = `https://level0.osmz.ru/?url=://overpass-api.de/api/interpreter?data=${encodeURI(encodeURI(query))}`;
        http://level0.osmz.ru/?url=%2F%2Foverpass-api.de%2Fapi%2Finterpreter%3Fdata
        a2.target = '_blank';
        td4.appendChild(a1);
        td4.appendChild(a2);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        new_tbody.appendChild(tr);
    });
    old_tbody.parentNode.replaceChild(new_tbody, old_tbody)
}
function get_data(){
    fetch('data/tags.json')
    .then(res => res.json())
    .then(res => {
        var table = document.createElement('table');
        res.forEach(tag => {
            fetch(`data/${tag.tag.replaceAll(':', '_')}.json`)
            .then(res => res.json())
            .then(res => {
                data[tag.tag.replaceAll(':', '_')] = res;
            });
            var tr = document.createElement('tr');
            var td1 = document.createElement('td');
            var a = document.createElement('a');
            a.href = `?tag=${tag.tag}`;
            a.setAttribute('data-tag', tag.tag);
            a.innerHTML = tag.tag;
            td1.appendChild(a);
            tr.appendChild(td1);
            table.appendChild(tr);
        });
        document.body.appendChild(table);
        
        var table2 = document.createElement('table');
        table2.id = 'issues_table';
        table2.appendChild(document.createElement('thead'));
        table2.appendChild(document.createElement('tbody'));

        document.body.appendChild(table2);
        Array.from(document.querySelectorAll('a'))
        .forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                var key = e.target.dataset.tag;
                window.history.pushState(`object or string`, document.title, `?key=${key}`);
                create_issues_table(key)
                console.log(e);
            })
        })
    });
}
get_data();
