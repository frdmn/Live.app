$(function() {
    /* Sidebar toggle */ 
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("active");
    });

    /* Modal */ 

    // Open modal
    $(".open-modal").click(function() {
        $(".modal").addClass("modal--open");
    });

    // Close modal
    $(".close-modal").click(function() {
        $(".modal").removeClass("modal--open");
    });

    // Listen on ESC to close modal
    $(document).keyup(function (e) {
        if (e.which == 27) {
            if ($(".modal").hasClass("modal--open")) {
                $(".modal").removeClass("modal--open");
            }
        }
    });

    /* Load settings */

    var settingsFile = '../../settings.json';
    var settings = [];
    $.ajax({
        type: 'GET',
        url: settingsFile,
        dataType: 'json',
        success: function(data) { settings = data;},
        async: false
    });

    console.log('API key: ' + settings.apiKey);

    /* API call function */

    var apiCall = function (endpoint, callback) {
        var pouchdb = new PouchDB(endpoint),
            pouchrows;

        pouchdb.get('apiData', function(err, response) {
            timestampNow = $.now();

            console.log('response.timestamp: ' + response.timestamp);
            console.log('timestampNow: ' + timestampNow);
            console.log('settings.cache.friends: ' + settings.cache.friends);
            console.log((timestampNow - response.timestamp) / 1000);

            if (!response || ((timestampNow - response.timestamp) / 1000 >= settings.cache.friends)) {
                console.log("[INFO] API call started");
                callApi(function(data) {
                    pouchdb.get('apiData', function(err, otherDoc) {
                        pouchdb.put({
                            apiData: data,
                            timestamp: $.now()
                        }, 'apiData', otherDoc._rev, function(err, response) {
                            console.log(err, response);
                        });
                    });
                    
                    console.log(data);
                    callback(data);

                    console.log("[INFO] API call finished");
                });
            } else {
                console.log("[INFO] DB call started");
                callDb(function(data){
                    console.log(data);
                    callback(data);
                    console.log("[INFO] DB call finished");
                });
            }
        });

        var callApi = function(cb) {
            $.ajaxSetup({
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-AUTH', settings.apiKey);
                }
            });

            $.get('https://xboxapi.com/v2'+endpoint, function (data) {
                cb(data);
                $.bootstrapGrowl("API call successful :)", { type: 'success' });
            }).fail(function() {
                // Send notification
                $.bootstrapGrowl("Couldn't connect to API :(", { type: 'danger' });
            });
        };

        var callDb = function (cb) {
            pouchdb.get('apiData', function(err, doc) {
                if (err) {console.log(err);}
                cb(doc.apiData);
            });
        };
    };

    /* Test /messages call
    apiCall('/messages', function(data) {
        var messages = data;
        $(messages).each(function(k,v) {
            if(v.header.hasText) {
                var sender = v.header.sender;
                var xuid = v.header.senderXuid;
                var message = v.messageSummary;
                console.log(sender + ' (' + xuid + '): ' + message);
            }
        });
    }); */

    apiCall('/' + settings.xuid + '/friends', function(data){
        var friends = data;
        console.log("asdads");
        $(friends).each(function(k,v) {
            $('.friendlist').append('<li><button class="pseudobutton open-modal"><div class="bubble"></div> ' + v.GameDisplayName + '</button></li>');
        });
    });
});

