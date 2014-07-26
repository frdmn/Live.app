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

    var apiCall = function (endpoint, type, callback) {
        // PouchDB init
        var pouchdb = new PouchDB(endpoint),
            pouchrows;

        // Try to get the cached API results out of PouchDB
        pouchdb.get('apiData', function(err, response) {
            timestampNow = $.now();

            // If no result or caching value exceeded => call API directly
            if (!response || ((timestampNow - response.timestamp) / 1000 >= settings.cache[type])) {
                console.log("[INFO] API call started");
                retrieveApiData(function(data) {
                    pouchdb.get('apiData', function(err, otherDoc) {
                        pouchdb.put({
                            apiData: data,
                            timestamp: $.now()
                        }, 'apiData', otherDoc._rev);
                    });

                    callback(data);

                    console.log("[INFO] API call finished");
                });
            // Otherwise return cached API results out of PouchDB
            } else {
                console.log("[INFO] DB call started");
                retrieveDbData(function(data){
                    callback(data);
                    console.log("[INFO] DB call finished");
                });
            }
        });

        /* Retrieve direct API data function */
        
        var retrieveApiData = function(cb) {
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

        /* Retrieve DB data function */

        var retrieveDbData = function (cb) {
            pouchdb.get('apiData', function(err, doc) {
                if (err) {console.log(err);}
                cb(doc.apiData);
            });
        };
    };

    // Test call to render the friends in the sidebar
    apiCall('/' + settings.xuid + '/friends','friends', function(data){
        var friends = data;
        // Add button for each friend
        $(friends).each(function(k,v) {
            $('.friendlist').append('<li><button class="pseudobutton open-modal"><div class="bubble"></div> ' + v.GameDisplayName + '</button></li>');
        });
    });
});

