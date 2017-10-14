var express = require('express');
var moment = require('moment');
var tutorRouter = express.Router();
var studentRouter = express.Router();
var adminRouter = express.Router();
var authMiddleware = require('../auth/middlewares/auth');
tutorRouter.use(authMiddleware.hasAuth);
tutorRouter.use(authMiddleware.isTutor);

studentRouter.use(authMiddleware.hasAuth);
studentRouter.use(authMiddleware.isStudent);

adminRouter.use(authMiddleware.hasAuth);
adminRouter.use(authMiddleware.isAdmin);

//adminRouter

//get
adminRouter.get('/', (req,res) => {
    res.render('userHome/views/admin/adminHome');
});

adminRouter.get('/subjects', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * FROM tblsubjects WHERE boolIsDeleted != 1`, (err, results, fields) => {
        if(err) return console.log(err)

        return renderna(results);
    });
    function renderna(result){
        res.render('userHome/views/admin/subjects', {resultsForPug: result});
    }
});

adminRouter.get('/delete/:id', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`UPDATE tblsubjects SET boolIsDeleted = 1 WHERE strSubjectCode = ${req.params.id}`, (err, results, fields) =>{
        if(err) return console.log(err)

        return res.redirect('/admin/subjects');
    });
});

adminRouter.route('/edit/:id')
    .get((req, res) =>{
        var db = require('../../lib/database')();
        db.query(`SELECT strSubjectCode, strSubjectDesc FROM tblsubjects WHERE strSubjectCode = ?`,[req.params.id], (err, results, fields) =>{
            if(err) return console.log(err)

            return res.render('userHome/views/admin/editSubject', {resultsForPug: results});
        });
    })
    .post((req, res) =>{
        var db = require('../../lib/database')();
        req.body.name = req.body.name.toUpperCase();
        db.query(`UPDATE tblsubjects SET strSubjectDesc = ? WHERE strSubjectCode = ?`,[req.body.name, req.params.id], (err, results, fields) =>{
            if(err) return console.log(err)
    
            return res.redirect('/admin/subjects');
        });
    });

adminRouter.get('/banned', (req, res) =>{
    var db = require('../../lib/database')();
    db.query('SELECT intBanID, strBannedUserName, strReason FROM tblban JOIN tblreport ON tblban.intBanID = tblreport.intReportID WHERE tblban.boolIsUnbanned != 1', (err, results, fields) =>{
        if(err) return console.log(err)

        return res.render('userHome/views/admin/bannedUsers', {resultsForPug: results});
    });
});

adminRouter.get('/reported', (req, res) =>{
    var db = require('../../lib/database')();
    db.query('SELECT * FROM tblreport WHERE intReportID NOT IN (SELECT intBanID FROM tblban)', (err, results, fields) =>{
        if(err) return console.log(err)

        return res.render('userHome/views/admin/reportedUsers', {resultsForPug: results});
    });
});

adminRouter.get('/transactions', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tbltransaction JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID 
    JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode`;
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err)

        return res.render('userHome/views/admin/transactions', {resultsForPug: results});
    });
});

adminRouter.get('/ban/:id/:name', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`INSERT INTO tblban(intBanID, strBannedUserName) VALUES(?,?)`,[req.params.id, req.params.name], (err, results, fields) =>{
        if(err) return console.log(err)

        return res.redirect('/admin/reported');
    });
});

adminRouter.get('/unban/:id', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`UPDATE tblban SET boolIsUnbanned = 1 WHERE intBanID = ?`,[req.params.id], (err, results, fields) =>{
        if(err) return console.log(err)

        return res.redirect('/admin/banned');
    });
});
// tutorRouter

//get
tutorRouter.get('/', (req,res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT tblsubjects.strSubjectDesc, tblrequest.strStudentUserName, tblsessions.dtmSessionDate
    FROM tbltransaction JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID 
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID
    JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode
    JOIN tblsessions ON tbltransaction.intTransactionID = tblsessions.intTransactionID
    WHERE tbloffer.strTutorUserName = '${req.session.user.strUsername}' AND tbltransaction.boolIsAccepted = 1 AND tblsessions.charStatusSession = 'S'
    ORDER BY tblsessions.dtmSessionDate ASC`;

    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        for(var i=0; i<results.length; i++){
            results[i].dtmSessionDate = moment(results[i].dtmSessionDate).format('LLLL');
        }
        return res.render('userHome/views/tutor/tutorHome', {resultsForPug: results});
    });
});

tutorRouter.get('/unknots', (req,res) =>{
    var db = require('../../lib/database')();
    db.query(`Select tblrequest.intRequestID, tblsubjects.strSubjectDesc, tblrequest.strStudentUserName, tblrequest.decBudgetPerSession, tblrequest.intNoOfSessions From tblrequest JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode WHERE tblrequest.charStatusRequest = 'P' `, (err,results,fields)=>{
        if (err) return console.log(err);

        res.render('userHome/views/tutor/tutorUnknots', {resultsForPug: results});
    });
});

tutorRouter.get('/notifications', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT tbltransaction.intTransactionID, tblrequest.intRequestID, tbltransaction.decTotalAmount, tblsubjects.strSubjectDesc, tblrequest.strStudentUserName, tbloffer.intOfferedNoOfSessions, tbloffer.decPricePerSession
    FROM tbltransaction JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID 
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID
    JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode
    WHERE tbloffer.strTutorUserName = '${req.session.user.strUsername}' AND tbltransaction.boolIsAccepted = 0`;
    db.query(queryString, (err,results,fields) =>{
        if(err) return console.log(err);

        return renderna(results);
    })

    function renderna(result){
        res.render('userHome/views/tutor/tutorNotif', {resultsForPug: result});
    }
});

tutorRouter.get('/offer/:id', (req, res) =>{
    res.render('userHome/views/tutor/offerForm', {reqID: req.params.id});
});

tutorRouter.get('/confirm=:id/pass=:id2', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * from tblsessions where intTransactionID = ? AND charStatusSession = 'P'`;

    db.query(queryString,[req.params.id], (err,results,fields) =>{
        if(err) return console.log(err);

        for(var i=0; i<results.length; i++){
            results[i].dtmSessionDate = moment(results[i].dtmSessionDate).format('LLLL');
        }
        return renderna(results,[req.params.id],[req.params.id2]);
    })

    function renderna(result,transacID,reqID){
        res.render('userHome/views/tutor/confirmTransac', {resultsForPug: result, idForPug: transacID, reqIDForPug: reqID});
    }
});

tutorRouter.get('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName='${req.session.user.strUsername}' OR strReceiverUserName = '${req.session.user.strUsername}' 
    GROUP BY LEAST(strSenderUserName,strReceiverUserName), GREATEST(strSenderUserName,strReceiverUserName)`
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        return renderna(results, req.query);
    });

    function renderna(result, query){
        res.render('userHome/views/tutor/tutorThread', {resultsForPug: result, me: [req.session.user.strUsername], reqQuery: query});
    }
});

tutorRouter.get('/messages/:name', (req, res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread JOIN tblmessagecontent ON tblmessagethread.intThreadID = tblmessagecontent.intMessageThreadID
    WHERE (tblmessagethread.strSenderUserName = ? AND tblmessagethread.strReceiverUserName = ?) OR (tblmessagethread.strSenderUserName = ? AND tblmessagethread.strReceiverUserName = ?)
    ORDER BY tblmessagecontent.dtmMessageSent ASC`;
    queryOne(req.params.name, req.session.user.strUsername)
    function queryOne(kausap, me){
        db.query(queryString,[me, kausap, kausap, me], (err, results, fields) => {
            if(err) return console.log (err);
    
            return res.render('userHome/views/tutor/tutorMessage', {resultsForPug: results, kausapForPug: kausap, meForPug: me});
        });
    }
});

//post
tutorRouter.post('/offer/:id', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `INSERT INTO tbloffer (strTutorUserName, intRequestID, decPricePerSession, intOfferedNoOfSessions) VALUES(?,?,?,?)`

    console.log(req.body)
    db.query(queryString, [req.session.user.strUsername, req.params.id, req.body.pricepersession, req.body.sessions], (err,results,fields)=>{
        if(err) return console.log(err);

        res.redirect('/tutor/unknots');
    });
});

tutorRouter.post('/confirm=:id/:req', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `UPDATE tblsessions set charStatusSession = 'S' where intTransactionID = ? AND charStatusSession = 'P'`;
    var queryString2 = `UPDATE tbltransaction set boolIsAccepted = 1 where intTransactionID = ?`;
    var queryString3 = `UPDATE tblrequest set charStatusRequest = 'S' where intRequestID = ?`;
    var queryString4 = `UPDATE tbloffer set charStatusOffer = 'A' where intOfferID = ?`;
    var queryString5 = `UPDATE tbloffer set charStatusOffer = 'D' where (intRequestID = ? AND charStatusOffer != 'A')`;

    db.query(queryString,[req.params.id], (err,results,fields) =>{
        if(err) return console.log(err);
    })

    db.query(queryString2,[req.params.id], (err,results,fields) =>{
        if(err) return console.log(err);

    })
    
    db.query(queryString3,[req.params.req], (err, results, fields) =>{
        if(err) return console.log(err);

    });

    queryOne(req.params.req,req.params.id);


    function queryOne(reqID,transac){
        console.log('TRANSACTION ' +transac);
        db.query(`SELECT intOfferID from tbltransaction WHERE intTransactionID = ?`,[transac], (err, results, fields) =>{
            if(err) return console.log(err);
    
            console.log(results[0]);
            console.log(results);
            return updateAccepted(results[0].intOfferID, reqID);
        });
    }
    function updateAccepted(acceptedID, reqID){
        db.query(queryString4,[acceptedID], (err, results, fields) => {
            if (err) return console.log(err);

            console.log('naging A na');
            return updateUnaccepted(reqID);
        });
    }
    function updateUnaccepted(requestID){
        console.log('request ID is' +requestID);
        db.query(queryString5,[requestID], (err, results, fields) => {
            if (err) return console.log(err);

            return res.redirect('/tutor');
        });
    }
})

tutorRouter.post('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName = ? AND strReceiverUserName = ?`;
    var queryString2 = `INSERT INTO tblmessagecontent(intMessageThreadID,strMessageContent,dtmMessageSent) VALUES (?,?,NOW())`;
    queryOne(req.body,req.session.user.strUsername);
    function queryOne(reqBody,sessionUser){
        console.log(reqBody)
        db.query(queryString,[sessionUser,reqBody.username], (err, results, fields) =>{
            if(err) return console.log(err);
    
            if(results.length !== 0){
                return insertContent(reqBody.content,results[0].intThreadID)
            }
            else{
                return queryTwo(reqBody,sessionUser);
            }
        });
    }
    function queryTwo(reqBody,sessionUser){
        var queryString4 = `SELECT * FROM tbluser WHERE strUsername = ?`;
        var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`;
        db.query(queryString4,[reqBody.username], (err,results,fields) =>{
            if(err) return console.log(err);

            if(results.length !==0){
                db.query(queryString3,[sessionUser,reqBody.username], (err,results,fields) =>{
                    if(err) return console.log(err);
        
                    return queryOne(reqBody,sessionUser);
                });
            }
            else return res.redirect('/tutor/messages?noUser')
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect('/tutor/messages')
        });
    }
});

tutorRouter.post('/messages/send/:name', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName = ? AND strReceiverUserName = ?`;
    var queryString2 = `INSERT INTO tblmessagecontent(intMessageThreadID,strMessageContent,dtmMessageSent) VALUES (?,?,NOW())`;
    var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`;
    queryOne(req.body,req.session.user.strUsername, req.params.name);
    function queryOne(reqBody,sessionUser,receiver){
        console.log(reqBody)
        db.query(queryString,[sessionUser,receiver], (err, results, fields) =>{
            if(err) return console.log(err);
    
            if(results.length !== 0){
                return insertContent(reqBody.content,results[0].intThreadID)
            }
            else{
                db.query(queryString3,[sessionUser,receiver], (err,results,fields) =>{
                    if(err) return console.log(err);
        
                    return queryOne(reqBody,sessionUser,receiver);
                });
            }
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect(`/tutor/messages/${req.params.name}`)
        });
    }
});

// studentRouter

//get
studentRouter.get('/', (req, res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT tblsubjects.strSubjectDesc, tbloffer.strTutorUserName, tblsessions.dtmSessionDate
    FROM tbltransaction JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID 
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID
    JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode
    JOIN tblsessions ON tbltransaction.intTransactionID = tblsessions.intTransactionID
    WHERE tblrequest.strStudentUserName = '${req.session.user.strUsername}' AND tbltransaction.boolIsAccepted = 1 AND (tblsessions.charStatusSession = 'S' OR tblsessions.charStatusSession = 'Q')
    ORDER BY tblsessions.dtmSessionDate ASC`;
    var queryString2 = `SELECT * FROM tbltutorratings WHERE strStudentUserName = '${req.session.user.strUsername}' AND boolIsRated = 0`
    
    function queryTwo(resultsOne){
        db.query(queryString2,(err,results,fields) =>{
            if(err) return console.log(err);

            return renderna(resultsOne,results,req.query);
        });
    }
    function renderna(resultsOne,resultsTwo,reqQuery){
        return res.render('userHome/views/student/studentHome', {resultsForPug: resultsOne, ratingForPug: resultsTwo, query: reqQuery});
    }
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        for(var i=0; i<results.length; i++){
                results[i].dtmSessionDate = moment(results[i].dtmSessionDate).format('LLLL');
        }
        return queryTwo(results);
    });

});

studentRouter.get('/ratetutor', (req, res) =>{
    console.log(req.query)
    var db = require('../../lib/database')();
    var queryString = `UPDATE tbltutorratings SET intRate = ?, boolIsRated = 1 WHERE intTransacRateID = ?`;
    db.query(queryString,[req.query.rating,req.query.transaction],(err, results, fields) =>{
        if(err) return console.log(err)

        return res.redirect('/student?rated');
    });
});

studentRouter.get('/transaction=/:offerID/and:reqID', (req,res) =>{
    req.session.transac = [req.params.offerID]
    console.log(req.session);
    res.redirect(`/student/transaction/${req.params.offerID}=${req.params.reqID}`);
});

studentRouter.get('/transaction=/edit/:offerID/and:reqID', (req,res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * from tbloffer WHERE intRequestID = ? AND intOfferID = ? AND charStatusOffer = 'W'`,[[req.params.reqID],[req.params.offerID]], (err, results, fields) =>{
        if(err) return console.log(err);

        var currentDate = new Date();
        currentDate = Date.now();
        currentDate = moment(currentDate).format("YYYY-MM-DDTHH:mm");
        console.log('currentDatetime is '+currentDate);
        return res.render('userHome/views/student/studentForm', {resultsForPug: results[0], reqIDForPug: req.params.reqID, offerIDForPug: req.params.offerID, dateTimeForPug: currentDate, edit: 1});
    });
});

studentRouter.get('/transaction/:offerID=:reqID', authMiddleware.authTransac,(req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT intOfferedNoOfSessions, decPricePerSession, strTutorUserName from tbloffer WHERE intRequestID = ? AND intOfferID = ?`,[[req.params.reqID],[req.params.offerID]], (err, results, fields) =>{
        if(err) return console.log(err);

        var currentDate = new Date();
        currentDate = Date.now();
        currentDate = moment(currentDate).format("YYYY-MM-DDTHH:mm");
        console.log('currentDatetime is '+currentDate);
        return res.render('userHome/views/student/studentForm', {resultsForPug: results[0], reqIDForPug: req.params.reqID, offerIDForPug: req.params.offerID, dateTimeForPug: currentDate, edit: 0});
    });
});

studentRouter.get('/myunknots', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * from tblrequest JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode WHERE tblrequest.strStudentUserName = '${req.session.user.strUsername}' AND tblrequest.charStatusRequest = 'P'`, (err, results, fields) =>{
        if(err) return console.log(err);

        return renderna(results, req.query);
    });
    function renderna(result, query){
        res.render('userHome/views/student/studentUnknots', {resultsForPug: result, reqQuery: query});
    }
});

studentRouter.get('/knotform', (req, res) =>{
    res.render('userHome/views/student/knotForm');
});

studentRouter.get('/unknot/:id', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * from tbloffer WHERE (intRequestID = ?) AND (charStatusOffer = 'P' OR charStatusOffer = 'W')`,[req.params.id], (err, results, fields) =>{
        if(err) return console.log(err);

        res.render('userHome/views/student/knotOffers', {resultsForPug: results, reqID: [req.params.id]});
    });
});

studentRouter.get('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName='${req.session.user.strUsername}' OR strReceiverUserName = '${req.session.user.strUsername}'
    GROUP BY LEAST(strSenderUserName,strReceiverUserName), GREATEST(strSenderUserName,strReceiverUserName)`
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        return renderna(results,req.query);
    });

    function renderna(result,query){
        res.render('userHome/views/student/studentThread', {resultsForPug: result, me: [req.session.user.strUsername], reqQuery: query});
    }
});

studentRouter.get('/messages/:name', (req, res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread JOIN tblmessagecontent ON tblmessagethread.intThreadID = tblmessagecontent.intMessageThreadID
    WHERE (tblmessagethread.strSenderUserName = ? AND tblmessagethread.strReceiverUserName = ?) OR (tblmessagethread.strSenderUserName = ? AND tblmessagethread.strReceiverUserName = ?)
    ORDER BY tblmessagecontent.dtmMessageSent ASC`;
    queryOne(req.params.name, req.session.user.strUsername)
    function queryOne(kausap, me){
        db.query(queryString,[me, kausap, kausap, me], (err, results, fields) => {
            if(err) return console.log (err);
    
            return res.render('userHome/views/student/studentMessage', {resultsForPug: results, kausapForPug: kausap, meForPug: me});
        });
    }
});

//post

studentRouter.post('/knotform', (req, res) =>{
    var subjectUpper = req.body.subject.toUpperCase();
    console.log(subjectUpper);
    firstQuery(subjectUpper);

    function newQuery(result,username,budget,sessions){
        var queryString = `INSERT INTO tblrequest(strSubjectCode,strStudentUserName,decBudgetPerSession,intNoOfSessions) VALUES(?,?,?,?)`;
        var db = require('../../lib/database')();
        db.query(queryString,[result.strSubjectCode,username,budget,sessions], (err, results, fields) =>{
            if(err) return console.log(err)
            console.log('REQUEST ADDED');

            return res.redirect('/student/myunknots');
        });
    }

    function firstQuery(subjectCode){
        console.log('nasa first query ako');
        var db = require('../../lib/database')();
        db.query(`SELECT * FROM tblsubjects WHERE strSubjectDesc = ?`, [subjectCode], (err, results, fields) =>{
            if(err) return console.log(err);
            console.log(results[0]);
            if(results[0] && results[0].length !== 0) return newQuery(results[0], req.session.user.strUsername, req.body.budget, req.body.sessions);
            else{
                console.log("punta ako second query");
                return secondQuery(req.session.user.strUsername, req.body.budget, req.body.sessions,subjectCode)
            }
        });
    }

    function secondQuery(username,budget,sessions,addSubject){
        console.log("nasa second query ako");
        var db = require('../../lib/database')();
        db.query(`select count(strSubjectCode) as subjCount from tblsubjects`, (err, results, fields)=>{
            var x = results[0].subjCount;
            var subjCode = "SUBJ" + x;
            console.log(subjCode);
            var queryString = `INSERT INTO tblsubjects(strSubjectCode,strSubjectDesc) VALUES (?,?)`;
            db.query(queryString,[subjCode,addSubject], (err, results, fields) =>{
                if(err) return console.log(err)
                console.log(""+subjCode+"is added to DATABASE");
            });
            console.log('punta ako third query')
            return thirdQuery (subjCode,username,budget,sessions);
        });
    }
    function thirdQuery(subjectCode,username,budget,sessions){
        console.log('nasa third query ako')
        var db = require('../../lib/database')();
        var queryString = `INSERT INTO tblrequest(strSubjectCode,strStudentUserName,decBudgetPerSession,intNoOfSessions) VALUES(?,?,?,?)`;
        
        db.query(queryString,[subjectCode, username, budget, sessions], (err, results, fields) =>{
            if(err) return console.log(err)
            console.log('REQUEST ADDED');

            return res.redirect('/student/myunknots');
        });
    }
});

studentRouter.post('/transaction/:offerID=:reqID', (req, res) =>{
    var db = require('../../lib/database')();
    queryString = `INSERT INTO tbltransaction(intRequestID,intOfferID,decTotalAmount) VALUES(?,?,?)`;
    var array = Object.keys(req.body)
        // iterate over them and generate the array
        .map(function(k) {
        // generate the array element 
        return [(req.body[k])];
        });
    console.log(array[0]+"///" + array[1]+'/////'+array.length);
    zeroQuery(array,req.params.offerID,req.params.reqID,array.length,req.body.total)
    function zeroQuery(array,offerid,reqid,loop,total){
        db.query(queryString,[reqid,offerid,total], (err, results, fields) =>{
            if(err) return console.log(err);
            return firstQuery(array,req.params.offerID,req.params.reqID,array.length);
        });
    }
    function firstQuery(array,offerid,reqid,loop){
        var db = require('../../lib/database')();
        queryString = `SELECT * FROM tbltransaction WHERE intRequestID = ? AND intOfferID = ?`;
        db.query(queryString,[reqid,offerid], (err, results, fields) =>{
            if(err) return console.log(err);
            console.log(results[0]);
            return secondQuery(array,results[0].intTransactionID,loop,offerid);
        });
    }

    function secondQuery(reqbody,transacid,loop,offer){
        console.log('nasa 2nd query na me')
        var db = require('../../lib/database')();
        var queryString = `INSERT INTO tblsessions (intTransactionID,dtmSessionDate) VALUES (?,?)`;
        for(var i=0;i<(loop-1);i++){
            db.query(queryString,[transacid,array[i]], (err,results,fields)=>{
                if(err) return console.log(err)
                console.log('Added <3')
            });
        }
        return thirdQuery(offer)
    }

    function thirdQuery(offerID){
        console.log('nasa 3rd query me')
        var db = require('../../lib/database')();
        var queryString = `UPDATE tbloffer set charStatusOffer = 'W' where intOfferID = ?`;
        db.query(queryString, [offerID], (err, results, fields) => {
            if(err) return console.log(err)

            return res.redirect('/student/myunknots?success')
        });
    }
});

studentRouter.post('/transaction/edit/:offerID=:reqID', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT intTransactionID from tbltransaction WHERE intOfferID = ? and intRequestID = ? `;
    var queryString2 = `UPDATE tblsessions SET dtmSessionDate = ? WHERE intTransactionID = ? AND intSessionID = ?`;
    var array = Object.keys(req.body)
    // iterate over them and generate the array
    .map(function(k) {
    // generate the array element 
    return [(req.body[k])];
    });
    var alis = array.pop();
    console.log(array);

    queryOne(req.params.offerID, req.params.reqID, array)

    function queryOne(offerID, reqID, arrays){
        db.query(queryString,[offerID,reqID], (err, results, fields) =>{
            if(err) return console.log(err);

            return getSessionIDs(results[0].intTransactionID, arrays)
        });
    }
    function getSessionIDs(transacID, reqBody){
        db.query(`SELECT intSessionID FROM tblsessions WHERE intTransactionID = ${transacID}`, (err, results, fields) =>{
            if(err) return console.log (err);

            console.log('array length is' +reqBody.length );
            var arrayOfSessionIDs = [];
            for(var i=0;i<reqBody.length;i++){
                arrayOfSessionIDs.push(results[i].intSessionID);
            }

            return queryTwo(transacID, reqBody, arrayOfSessionIDs);
        });
    }
    function queryTwo(transacID, reqBody, sessions){
        for(var o=0; o<reqBody.length;o++){
            db.query(queryString2,[reqBody[o], transacID, sessions[o]], (err, results, fields) =>{
                if (err) return console.log(err)

                console.log('session date updated');
            });
            
        }
        return res.redirect('/student/myunknots?success');
    }
});

studentRouter.post('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName = ? AND strReceiverUserName = ?`;
    var queryString2 = `INSERT INTO tblmessagecontent(intMessageThreadID,strMessageContent,dtmMessageSent) VALUES (?,?,NOW())`;
    queryOne(req.body,req.session.user.strUsername);
    function queryOne(reqBody,sessionUser){
        console.log(reqBody)
        db.query(queryString,[sessionUser,reqBody.username], (err, results, fields) =>{
            if(err) return console.log(err);
    
            if(results.length !== 0){
                return insertContent(reqBody.content,results[0].intThreadID)
            }
            else{
                return queryTwo(reqBody,sessionUser);
            }
        });
    }
    function queryTwo(reqBody,sessionUser){
        var queryString4 = `SELECT * FROM tbluser WHERE strUsername = ?`;
        var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`;
        db.query(queryString4,[reqBody.username], (err,results,fields) =>{
            if(err) return console.log(err);

            if(results.length !==0){
                db.query(queryString3,[sessionUser,reqBody.username], (err,results,fields) =>{
                    if(err) return console.log(err);
        
                    return queryOne(reqBody,sessionUser);
                });
            }
            else return res.redirect('/student/messages?noUser')
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect('/student/messages')
        });
    }
});

studentRouter.post('/messages/send/:name', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName = ? AND strReceiverUserName = ?`;
    var queryString2 = `INSERT INTO tblmessagecontent(intMessageThreadID,strMessageContent,dtmMessageSent) VALUES (?,?,NOW())`;
    var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`;
    queryOne(req.body,req.session.user.strUsername, req.params.name);
    function queryOne(reqBody,sessionUser,receiver){
        console.log(reqBody)
        db.query(queryString,[sessionUser,receiver], (err, results, fields) =>{
            if(err) return console.log(err);
    
            if(results.length !== 0){
                return insertContent(reqBody.content,results[0].intThreadID)
            }
            else{
                db.query(queryString3,[sessionUser,receiver], (err,results,fields) =>{
                    if(err) return console.log(err);
        
                    return queryOne(reqBody,sessionUser,receiver);
                });
            }
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect(`/student/messages/${req.params.name}`)
        });
    }
});

exports.tutor = tutorRouter;
exports.student = studentRouter;
exports.admin = adminRouter;
