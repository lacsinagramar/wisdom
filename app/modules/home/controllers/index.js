module.exports = (req, res) => {
    var hasSession;
    if(req.session && req.session.user) 
    {
        var sessionUser = req.session.user.strUsername;
        var userType = req.session.user.charUserType;
        hasSession=1;
        res.render('home/views/index', {hasSessionForPug: hasSession, sessionUserForPug: sessionUser, userTypeForPug: userType, reqQuery: req.query});
    }
    else 
    {
        hasSession=0;
        res.render('home/views/index', {hasSessionForPug: hasSession, reqQuery: req.query});
    }
    var db = require('../../../lib/database')();
    var queryString2 = `SELECT * FROM tblsessions`
    var queryString3 = `SELECT intTransactionID FROM tbltransaction`
    var queryString4 = `SELECT tbltransaction.intTransactionID, tbloffer.intOfferedNoOfSessions,tbloffer.strTutorUserName, tblrequest.strStudentUserName,
    (SELECT COUNT(intSessionID) FROM tblsessions WHERE intTransactionID = ? AND charStatusSession = 'D') AS doneSessions
    FROM tbltransaction
    JOIN tblsessions ON tbltransaction.intTransactionID = tblsessions.intTransactionID
    JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID
    WHERE tbltransaction.intTransactionID = ?`
    var queryString5 = `INSERT INTO tbltutorratings(intTransacRateID,strTutorUserName,strStudentUserName) VALUES(?,?,?)`

    db.query(queryString2,(err, results, fields) => {
        if(err) return console.log(err)

        var bilang = results.length;
        var dateNow = new Date();
        dateNow = Date.now();

        for(var p=0; p<bilang;p++){
            if(results[p].dtmSessionDate < dateNow){
                updateTableSession(results[p].intSessionID, function(){
                    console.log('updated a sesion');
                })
            }
        }
        var arrayOfTransactionIDs = [];
        return getAllTransactions(arrayOfTransactionIDs, function(){
            console.log('got all transactions');
        });
    });
    function updateTableSession(ID, callback){
        db.query(`UPDATE tblsessions SET charStatusSession = 'D' WHERE intSessionID = ${ID}`, (err, results, fields) =>{
            if(err) return console.log(err);

            return callback();
        });
    }
    function getAllTransactions(arrayOfTransactionIDs, callback){
        console.log('getAllTransactions');
        db.query(queryString3, (err,results,fields) =>{
            if(err) return console.log(err)

            for(var i = 0; i<results.length; i++){
                arrayOfTransactionIDs.push(results[i].intTransactionID)
            }
            console.log(arrayOfTransactionIDs)
            return validateFunction(arrayOfTransactionIDs, function(){
                return callback();
            });
        });
    }
    function validateFunction(arrayOfTransactionIDs, callback){
        console.log('validateFunction');
        var poppedID = arrayOfTransactionIDs.pop();
        db.query(queryString4,[poppedID,poppedID], (err, results, fields) =>{
            if(err) return console.log(err);

            if(results[0].doneSessions === results[0].intOfferedNoOfSessions){
                insertTutorRatings(results[0], function() {
                    if(arrayOfTransactionIDs.length === 0) return callback();
                    else return validateFunction(arrayOfTransactionIDs, function(){
                        console.log('validated a transaction');
                    });
                });
            }
            else{
                if(arrayOfTransactionIDs.length === 0) return callback();
                else return validateFunction(arrayOfTransactionIDs, function(){
                    console.log('validated a transaction');
                });
            }            
        });
    }
    function insertTutorRatings(infos, callback){
        console.log('insertTutorRatings');
        db.query(`SELECT * FROM tbltutorratings`, (err, results, fields) =>{
            if(err) return console.log(err)

            for(var o = 0; o<results.length; o++){
                if(results[o].intTransacRateID !== infos.intTransactionID) continue;
                else return callback();
            }

            db.query(queryString5,[infos.intTransactionID,infos.strTutorUserName,infos.strStudentUserName], (err, results, fields) =>{
                if(err) return console.log(err)

                return callback();
            });
        })
    }
}