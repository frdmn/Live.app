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

    console.log(settings.apiKey);



    /* Initial API check */

    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-AUTH', settings.apiKey);
        }
    });

    /* API call function */

    var apiCall = function (endpoint, callback) {

        var pouchdb = new PouchDB(endpoint),
            pouchrows;

        pouchdb.allDocs({include_docs: true}, function(err, response) {
            pouchrows = response.total_rows;
            console.log(pouchrows);
            if (pouchrows === 0) {
                // callApi();
                console.log("APICALL");
                pouchdb.put({
                    _id: 'davasdasde@gmail.com',
                    name: 'Davidsss',
                    age: 67
                });
            } else {
                // callDb();
                console.log("DBCALL");
            }
        });

        var callApi = function() {
            $.get('https://xboxapi.com/v2'+endpoint, function (data) {
                callback(data);
                $.bootstrapGrowl("API call successful :)", { type: 'success' });
            }).fail(function() {
                // Send notification
                $.bootstrapGrowl("Couldn't connect to API :(", { type: 'danger' });
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
        $(friends).each(function(k,v) {
            $('.friendlist').append('<li><button class="pseudobutton open-modal"><div class="bubble"></div> ' + v.GameDisplayName + '</button></li>');
        });
    });
});

