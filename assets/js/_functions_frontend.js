/* Function to open modal */ 

var renderModal = function(recipientsList, messagebody){
    // Selector helpers
    var recipientsSelector = '.modal#composemessage select.chosen-recipients';
    var messageSelector = '.modal#composemessage textarea#messagebody';
    var modalSelector = '.modal#composemessage';

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
    PouchDB.allDbs().then(function (dbs) {
      callback(dbs);
    }).catch(function (err) {
      console.log(err);
      callback(false);
    });
};

/* Function to delete a database */
 
var deletePouchDB = function(database, callback){
    var pouchdb = new PouchDB(database);
    pouchdb.destroy(function(err, info) {
        if (!err){
            callback(true);
        } else {
            console.log(err);
            callback(false);
        }
    });
};