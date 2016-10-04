function hello() {
}

(function(){
   // console.log('start');
})();

function ajax(url, options) {
    if (!url) {
        console.log("No Target URL is provided. URL : " + url);
        return -1;
    }

    var parameters = '';
    var callback = false; // callback function

    // Getting provided callback function
    if (typeof options.callback === 'function') {
        callback = options.callback;
    } else if (typeof options.callback === 'string') {
        callback = window[options.callback];
    }

    // Creating url string from the parameters
    if (options.data instanceof Object) {
        for (key in options.data) {
            if (parameters.length > 0) parameters = parameters + '&';
            parameters = parameters + key + '=' + options.data[key];
        }
    } else if (typeof options.data === 'string') {
        parameters = parameters + options.data;
    }

    // jsonp part
    if (options.jsonp) {
        var cbnum = Math.random().toString(16).slice(2);
        var script = document.createElement('script');

        if (parameters.length > 0) {
            parameters = '?' + parameters + '&callback=cb' + cbnum;
        } else {
            parameters = '?callback=cb' + cbnum;
        }

        window['cb' + cbnum] = function (data) {

            try {
                callback(data);
            }
            finally {
                delete window['cb' + cbnum];
                script.parentNode.removeChild(script);
            }
        }

        script.src = url + parameters;

        document.body.appendChild(script);

        // Local ajax part
    } else {
        var xmlhttp;

        if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp = new XMLHttpRequest();
        } else {// code for IE6, IE5
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }

        if (!xmlhttp) {
            console.log("XMLHTTP initiating is failed");
            return -2;
        }

        if (callback) {
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4) {
                    if (xmlhttp.status == 200 || xmlhttp.status == 0) {
                        callback(xmlhttp.responseText);
                    } else {
                        console.log("XMLHTTP Response error : " + xmlhttp.statusText);
                        return -4;
                    }
                }
            }
        }

        try {
            if (options.isPost) {
                xmlhttp.open("POST", url, true);
                xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xmlhttp.send(parameters);
            } else {
                xmlhttp.open("GET", url + '?' + parameters, true);
                xmlhttp.send();
            }
        } catch (err) {
            console.log("XMLHTTP Request error : " + err.message);
            return -3;
        }
    }
}