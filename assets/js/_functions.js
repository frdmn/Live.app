/*  Function to check API key */

var checkApiKey = function(input, callback) {
    var apiKey = input;
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-AUTH', apiKey);
        }
    });

    // Send request to check API key and also store the Xuid on success 
    $.get('https://xboxapi.com/v2/accountXuid', function (data) {
        callback(data);
    // Return false
    }).fail(function() {
        callback(false);
    });
};

/* API call function */

var apiCall = function (apiKey, endpoint, cache, callback) {
    // Try to get the cached API results out of PouchDB
    retrieveDbData(endpoint, function(data){
        timestampNow = $.now();
        var dataExpiredCondition = (timestampNow - data.timestamp) / 1000,
            dataExpired = (dataExpiredCondition >= cache);

        // If no result or caching value exceeded => call API directly
        // Otherwise return cached API results out of PouchDB
        if (!data || dataExpired) {
            // Display caching status of cachable objects in PouchDB
            if (data && dataExpired) {
                console.log('[INFO] Cache expired for "' + endpoint + ': ' + dataExpiredCondition + ' ms > ' + cache);
            }

            console.log('[INFO] API call "' + endpoint + '" started');

            // Execute retrieve function
            retrieveApiData(apiKey, endpoint, function(data) {
                // In case of server side API error, return false
                // Otherwise proceed to transfer the API results into local database
                if (!data) {
                    console.log('[WARN] Couldn\'t finish API call "' + endpoint + '"!');
                    callback(false);
                } else {
                    // Create new object to append a timestamp
                    var jsonObject = {};
                    jsonObject.timestamp  = timestampNow;
                    jsonObject.jsonData = data;

                    // Try to submit the data into the DB
                    submitDbData(jsonObject, endpoint, function(submitData){
                        // Return false in case of error
                        // Otherwise, send to callback 
                        if (!submitData) {
                            callback(false);
                        } else {
                            callback(data);
                            console.log('[INFO] API call "' + endpoint + '" finished');                               
                        }
                    });
                }
            });
        } else {
            console.log('[INFO] DB call "' + endpoint + '" started');
            // Retrieve cached data
            retrieveDbData(endpoint, function(data){
                // Send callback
                callback(data.jsonData);
                console.log('[INFO] DB call "' + endpoint + '" finished');
            });
        }
    });
};

/* Retrieve direct API data function */
    
var retrieveApiData = function(apiKey, endpoint, callback) {
    // Prepare ajax request
    $.ajaxSetup({
        beforeSend: function(xhr) {
            // Add X-AUTH header
            xhr.setRequestHeader('X-AUTH', apiKey);
        }
    });

    // Fire GET
    $.get('https://xboxapi.com/v2'+endpoint, function (data) {
        callback(data);
    // In case of any error, return false
    }).fail(function() {
        callback(false);
    });
};

/* Retrieve DB data function */

var retrieveDbData = function (endpoint, callback) {
    // PouchDB init
    var pouchdb = new PouchDB(endpoint);
    // Try to get()
    pouchdb.get('jsonData', function(err, doc) {
        // In case of error, return false
        if (err) {
            if (err.status != 404) {
                console.log(err);
            }
            callback(false);
        }
        // If no error, send data to callback
        if (doc) {
            callback(doc);
        }
    });
};

/* Sumbit API data function */

var submitApiData = function (endpoint, content, callback) {
    // Test API key
    apikey = "ABC123";

    // Prepare ajax request
    $.ajaxSetup({
        beforeSend: function(xhr) {
            // Add X-AUTH header
            xhr.setRequestHeader('X-AUTH', apikey);
        }
    });

    // Fire POST
    $.post('https://xboxapi.com/v2'+endpoint, content, function (data) {
        callback(data);
        console.log(data);
    // In case of any error, return false
    }).fail(function() {
        callback(false);
    });
};

/* Submit DB data function */

var submitDbData = function (input, endpoint, callback) {
    // PouchDB init    
    var pouchdb = new PouchDB(endpoint);

    // Check for existing data
    pouchdb.get('jsonData', function(err, otherDoc) {
        // If no exisiting data, put() without revision
        // Otherwise put() with revision of outdated data
        if (!otherDoc) {
            // Try to put() the input object into PouchDB
            pouchdb.put(input, 'jsonData', function(err, response) {
                // In case of errors, return false
                if (err) {
                    console.log(err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    callback(response);
                }
            });
        } else {
            // Try to put() the input object into PouchDB
            pouchdb.put(input, 'jsonData', otherDoc._rev, function(err, response) {
                // In case of errors, return false
                if (err) {
                    console.log(err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    callback(response);
                }
            });
        }
    });
};

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

                    // submitApiData('/messages', {recipients: ['2535470525950774'], message: "test"}, function(callback){
                    //     $(modalSelector).modal('show');
                    //     return true;
                    // });
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
            console.log(info);
            callback(true);
        } else {
            callback(false);
        }
    });
};