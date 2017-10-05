var express = require('express');
var moment = require('moment');
var tutorRouter = express.Router();
var studentRouter = express.Router();
var authMiddleware = require('../auth/middlewares/auth');
tutorRouter.use(authMiddleware.hasAuth);
tutorRouter.use(authMiddleware.isTutor);

studentRouter.use(authMiddleware.hasAuth);
studentRouter.use(authMiddleware.isStudent);

// tutorRouter

//get
tutorRouter.get('/', (req,res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT tblsubjects.strSubjectDesc, tblrequest.strStudentUserName, tblsessions.dtmSessionDate
    FROM tbltransaction JOIN tbloffer ON tbltransaction.intOfferID = tbloffer.intOfferID 
    JOIN tblrequest ON tbltransaction.intRequestID = tblrequest.intRequestID
    JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode
    JOIN tblsessions ON tbltransaction.intTransactionID = tblsessions.intTransactionID
    WHERE tbloffer.strTutorUserName = '${req.session.user.strUsername}' AND tbltransaction.boolIsAccepted = 1 AND tblsessions.charStatusSession = 'S'`;

    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

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

        return renderna(results,[req.params.id],[req.params.id2]);
    })

    function renderna(result,transacID,reqID){
        res.render('userHome/views/tutor/confirmTransac', {resultsForPug: result, idForPug: transacID, reqIDForPug: reqID});
    }
});

tutorRouter.get('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName='${req.session.user.strUsername}' OR strReceiverUserName = '${req.session.user.strUsername}'`
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        return renderna(results);
    });

    function renderna(result){
        res.render('userHome/views/tutor/tutorThread', {resultsForPug: result, me: [req.session.user.strUsername]});
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

    db.query(queryString,[req.params.id], (err,results,fields) =>{
        if(err) return console.log(err);
    })

    db.query(queryString2,[req.params.id], (err,results,fields) =>{
        if(err) return console.log(err);

    })
    
    db.query(queryString3,[req.params.req], (err, results, fields) =>{
        if(err) return console.log(err);

        return res.redirect('/tutor');
    });
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
        var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`
        db.query(queryString3,[sessionUser,reqBody.username], (err,results,fields) =>{
            if(err) return console.log(err);

            return queryOne(reqBody,sessionUser);
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect('/tutor/messages')
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
    WHERE tblrequest.strStudentUserName = '${req.session.user.strUsername}' AND tbltransaction.boolIsAccepted = 1 AND tblsessions.charStatusSession = 'S'`;

    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        return res.render('userHome/views/student/studentHome', {resultsForPug: results});
    });
});

studentRouter.get('/transaction=/:offerID/and:reqID', (req,res) =>{
    req.session.transac = [req.params.offerID]
    console.log(req.session);
    res.redirect(`/student/transaction/${req.params.offerID}=${req.params.reqID}`);
});

studentRouter.get('/transaction/:offerID=:reqID', authMiddleware.authTransac,(req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT intOfferedNoOfSessions, decPricePerSession, strTutorUserName from tbloffer WHERE intRequestID = ? AND intOfferID = ?`,[[req.params.reqID],[req.params.offerID]], (err, results, fields) =>{
        if(err) return console.log(err);

        var currentDate = new Date();
        currentDate = moment(currentDate).format("YYYY-MM-DD");
        console.log(currentDate);
        return res.render('userHome/views/student/studentForm', {resultsForPug: results[0], reqIDForPug: req.params.reqID, offerIDForPug: req.params.offerID, dateTimeForPug: currentDate});
    });
});

studentRouter.get('/myunknots', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * from tblrequest JOIN tblsubjects ON tblrequest.strSubjectCode = tblsubjects.strSubjectCode WHERE tblrequest.strStudentUserName = '${req.session.user.strUsername}' AND tblrequest.charStatusRequest = 'P'`, (err, results, fields) =>{
        if(err) return console.log(err);

        res.render('userHome/views/student/studentUnknots', {resultsForPug: results});
    });
});

studentRouter.get('/knotform', (req, res) =>{
    res.render('userHome/views/student/knotForm');
});

studentRouter.get('/unknot/:id', (req, res) =>{
    var db = require('../../lib/database')();
    db.query(`SELECT * from tbloffer WHERE intRequestID = ? AND charStatusOffer = 'P'`,[req.params.id], (err, results, fields) =>{
        if(err) return console.log(err);

        res.render('userHome/views/student/knotOffers', {resultsForPug: results, reqID: [req.params.id]});
    });
});

studentRouter.get('/messages', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tblmessagethread WHERE strSenderUserName='${req.session.user.strUsername}' OR strReceiverUserName = '${req.session.user.strUsername}'`
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err);

        return renderna(results);
    });

    function renderna(result){
        res.render('userHome/views/student/studentThread', {resultsForPug: result, me: [req.session.user.strUsername]});
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
            return secondQuery(array,results[0].intTransactionID,loop);
        });
    }

    function secondQuery(reqbody,transacid,loop){
        console.log('nasa 2nd query na me')
        var db = require('../../lib/database')();
        var queryString = `INSERT INTO tblsessions (intTransactionID,dtmSessionDate) VALUES (?,?)`;
        for(var i=0;i<(loop-1);i++){
            db.query(queryString,[transacid,array[i]], (err,results,fields)=>{
                if(err) return console.log(err)
                console.log('Added <3')
            });
        }
        return res.redirect('/student/myunknots');
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
        var queryString3 = `INSERT INTO tblmessagethread(strSenderUserName, strReceiverUserName) VALUES(?,?)`
        db.query(queryString3,[sessionUser,reqBody.username], (err,results,fields) =>{
            if(err) return console.log(err);

            return queryOne(reqBody,sessionUser);
        });
    }
    function insertContent(messageContent,threadID){
        db.query(queryString2,[threadID,messageContent], (err,results,fields) =>{
            if(err) return console.log(err)

            return res.redirect('/student/messages')
        });
    }
});

exports.tutor = tutorRouter;
exports.student = studentRouter;
