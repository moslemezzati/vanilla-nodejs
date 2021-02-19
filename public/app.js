/*
 * Frontend Logic for application
 *
 */

var app = {};

app.config = {
    'sessionToken': false
};

app.client = {}

app.client.request = function (headers, path, method, queryStringObject, payload, callback) {

    // Set defaults
    headers = typeof (headers) == 'object' && headers !== null ? headers : {};
    path = typeof (path) == 'string' ? path : '/';
    method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].includes(method.toUpperCase()) ? method.toUpperCase() : 'GET';
    queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
    payload = typeof (payload) == 'object' && payload !== null ? payload : {};
    callback = typeof (callback) == 'function' ? callback : false;

    let queryString = new URLSearchParams();
    for (var queryKey in queryStringObject) {
        queryString.append(queryKey, queryStringObject[queryKey]);
    }
    let requestUrl = path;
    if (queryString.length > 0) {
        requestUrl += queryString;
    }
    var xhr = new XMLHttpRequest();
    xhr.open(method, requestUrl, true);
    xhr.setRequestHeader("Content-type", "application/json");

    for (var headerKey in headers) {
        if (headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
    }

    if (app.config.sessionToken) {
        xhr.setRequestHeader("token", app.config.sessionToken.id);
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var statusCode = xhr.status;
            var responseReturned = xhr.responseText;

            if (callback) {
                try {
                    var parsedResponse = JSON.parse(responseReturned);
                    callback(statusCode, parsedResponse);
                } catch (e) {
                    callback(statusCode, false);
                }
            }
        }
    }

    var payloadString = JSON.stringify(payload);
    xhr.send(payloadString);
};


function showError(msg, formId) {
    document.querySelector("#" + formId + " .formError").innerHTML = msg;
    document.querySelector("#" + formId + " .formError").style.display = 'block';
}


app.bindForms = function () {
    const form = document.querySelector("form");
    if (!form) {
        return;
    }
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();

        document.querySelector("#" + formId + " .formError").style.display = 'hidden';

        var payload = {};
        var elements = this.elements;
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].type !== 'submit') {
                var valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
                payload[elements[i].name] = valueOfElement;
            }
        }
        app.client.request(undefined, path, method, undefined, payload, function (statusCode, responsePayload) {
            if (statusCode !== 200 && statusCode !== 201) {
                var error = typeof (responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
                showError(error, formId);
            } else {
                app.formResponseProcessor(formId, payload, responsePayload);
            }

        });
    });
};


app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
    if (formId == 'accountCreate') {
        var newPayload = {
            'phone': requestPayload.phone,
            'password': requestPayload.password
        };
        app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, function (newStatusCode, newResponsePayload) {
            if (newStatusCode !== 200) {
                return showError('Sorry, an error has occured. Please try again.', formId);
            }
            app.setSessionToken(newResponsePayload);
            window.location = '/checks/all';
        });
    }
    if (formId == 'sessionCreate') {
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }
};


app.getSessionToken = function () {
    var tokenString = localStorage.getItem('token');
    if (typeof (tokenString) == 'string') {
        try {
            var token = JSON.parse(tokenString);
            app.config.sessionToken = token;
            if (typeof (token) == 'object') {
                app.setLoggedInClass(true);
            } else {
                app.setLoggedInClass(false);
            }
        } catch (e) {
            app.config.sessionToken = false;
            app.setLoggedInClass(false);
        }
    }
};


app.setLoggedInClass = function (add) {
    var target = document.querySelector("body");
    if (add) {
        target.classList.add('loggedIn');
    } else {
        target.classList.remove('loggedIn');
    }
};


app.setSessionToken = function (token) {
    app.config.sessionToken = token;
    var tokenString = JSON.stringify(token);
    localStorage.setItem('token', tokenString);
    if (typeof (token) == 'object') {
        app.setLoggedInClass(true);
    } else {
        app.setLoggedInClass(false);
    }
};


app.renewToken = function (callback) {
    var currentToken = typeof (app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
    if (currentToken) {
        var payload = {
            'id': currentToken.id,
            'extend': true,
        };
        app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, function (statusCode) {
            if (statusCode == 200) {
                var queryStringObject = { 'id': currentToken.id };
                app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
                    if (statusCode == 200) {
                        app.setSessionToken(responsePayload);
                        callback(false);
                    } else {
                        app.setSessionToken(false);
                        callback(true);
                    }
                });
            } else {
                app.setSessionToken(false);
                callback(true);
            }
        });
    } else {
        app.setSessionToken(false);
        callback(true);
    }
};


app.tokenRenewalLoop = function () {
    setInterval(function () {
        app.renewToken(function (err) {
            if (!err) {
                console.log("Token renewed successfully @ " + Date.now());
            }
        });
    }, 1000 * 60);
};

app.logUserOut = function () {
    var tokenId = typeof (app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
    app.client.request(undefined, 'api/tokens', 'DELETE', { 'id': tokenId }, undefined, () => {
        app.setSessionToken(false);
        window.location = '/session/deleted';
    });
};


app.bindLogoutButton = function () {
    document.getElementById("logoutButton").addEventListener("click", function (e) {
        e.preventDefault();
        app.logUserOut();
    });
};

app.init = function () {
    app.bindForms();
    app.getSessionToken();
    app.tokenRenewalLoop();
    app.bindLogoutButton();
};

window.onload = function () {
    app.init();
};
