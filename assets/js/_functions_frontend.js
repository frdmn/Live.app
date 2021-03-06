/* Function to open modal */

var renderModal = function(recipientsList, messagebody){
    // Selector helpers
    var recipientsSelector = '.modal#composemessage select.chosen-recipients',
        messageSelector = '.modal#composemessage textarea#messagebody';
        modalSelector = '.modal#composemessage';

    // If message body, prefill
    if (messagebody) {
        $(messageSelector).html(messagebody);
    }

    // Get our personal xUid out of settins DB
    retrieveDbData('settings', function(data){
        if (data) {
            var myXuid = data.xuid;

            // Now get all friends out of PouchDB
            retrieveDbData('/' + myXuid + '/friends', function(data){
                if (data) {
                    // Variable initalization
                    var friendsList = [],
                        i = 0;

                    // Store each friend in a object to parse easier
                    $(data.jsonData).each(function(k,v){
                        var friendObject = {};
                        friendObject.id = i;
                        friendObject.xuid = v.id;
                        friendObject.gamertag = v.Gamertag;
                        friendsList.push(friendObject);
                        i++;
                    });

                    // Add all friends to Chosen select
                    $(friendsList).each(function(k,v){
                        $(recipientsSelector).append('<option value="' + v.xuid + '">' + v.gamertag + '</option>');
                    });

                    // Preselect the recipient
                    $(recipientsList).each(function(k, v){
                        $(recipientsSelector + ' option[value="' + v.xuid + '"]').attr('selected',true);
                    });

                    // Init the chosen select and show the modal
                    $(recipientsSelector).chosen({ width:"100%" });
                    // Update in case chosen instance is already initiated
                    $(recipientsSelector).trigger("chosen:updated");

                    $(modalSelector).modal('show');
                    return true;
                }
            });
        }
    });
};

/* Function to list all local PouchDBs using all-db's plugin */

var listPouchDBs = function(callback){
    // Use pouchdb-all-dbs plugin to list all existing PouchDBs
    PouchDB.allDbs().then(function (dbs) {
        // Send databases as string array to callback
        callback(dbs);
    }).catch(function (err) {
        // In case of error, log and callback(false)
        log.error("[ERROR] Error while listing databases: ", err);
        callback(false);
    });
};

/* Function to delete a database */

var deletePouchDB = function(database, callback){
    // PouchDB init
    var pouchdb = new PouchDB(database);
    // Try to destroy the specific database
    pouchdb.destroy(function(err, info) {
        // If no error, callback(true),
        // Otherwise, log error and callback(false)
        if (!err){
            callback(true);
        } else {
            log.error("[ERROR] Error while destroying databases: ", err);
            callback(false);
        }
    });
};

/* Function to show/hide spinner */

var showLoadingSpinner = function() {
    // Show actual spinner
    $('.icon-loading').show();
    // And the spinning wheel cursor
    $('html').addClass('wait-cursor');
};

var hideLoadingSpinner = function() {
    // Hide actual spinner
    $('.icon-loading').hide();
    // And the spinning wheel cursor
    $('html').removeClass('wait-cursor');
};

/* Sort friends based on connectivity status */

function sortFriendsList(selector) {
    $(selector).children("li").sort(function(a, b) {
        var upA = $(a).find('span').hasClass('bubble--offline');
        var upB = $(b).find('span').hasClass('bubble--offline');
        return (upA < upB) ? -1 : (upA > upB) ? 1 : 0;
    }).appendTo(selector);
}
