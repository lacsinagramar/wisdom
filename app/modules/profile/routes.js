var express = require('express');
var profileRouter = express.Router();
var authMiddleware = require('../auth/middlewares/auth');
profileRouter.use(authMiddleware.hasAuth);

profileRouter.get('/:name', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tbluser WHERE tbluser.strUsername = ?`;
    var queryString2 = `SELECT AVG(intRate) AS finalRate FROM tbltutorratings WHERE strTutorUserName = ? AND boolIsRated = 1`
    var queryString3 = `SELECT * FROM tbluser 
    JOIN tbltutor ON tbluser.strUsername = tbltutor.strUserName 
    JOIN tbltutorteaches ON tbltutorteaches.strTutorUserName = tbltutor.strUserName
    JOIN tblsubjects ON tbltutorteaches.strSubjectCode = tblsubjects.strSubjectCode
    WHERE tbluser.strUsername = ?`;
    db.query(queryString,[req.params.name], (err, results, fields) =>{
        if(err) return console.log(err);

        if(results[0].charUserType === 'T') return ratings(results[0].strUsername)
        else return res.render('profile/views/profile', {resultsForPug: results, me: req.session.user.strUsername, query: req.query});
    });
    function tutor(username,rating){
        db.query(queryString3,[username], (err, results, fields) =>{
            if(err) return console.log(err)

            return res.render('profile/views/profile', {resultsForPug: results, tutorRatings: rating, me: req.session.user.strUsername, query: req.query});
        });
    }
    function ratings(username){
        db.query(queryString2,[username], (err, results, fields) =>{
            if(err) return console.log(err)

            return tutor(username,results[0].finalRate)
        });
    }
});

profileRouter.get('/message/:name', (req, res) => {
    var db = require('../../lib/database')();
    var queryString = `SELECT * FROM tbluser WHERE tbluser.strUsername = '${req.session.user.strUsername}'`;
    db.query(queryString, (err, results, fields) =>{
        if(err) return console.log(err)

        if(results[0].charUserType === 'T') return res.redirect(`/tutor/messages/${req.params.name}`);
        else if(results[0].charUserType === 'S') return res.redirect(`/student/messages/${req.params.name}`);
        else if(results[0].charUserType === 'A') return res.redirect(`/admin/messages/${req.params.name}`);
    });
});

profileRouter.get('/report/:name', (req, res) =>{
    var db = require('../../lib/database')();
    var queryString = `INSERT INTO tblreport(strReporterUserName, strReportedUserName, strReason) VALUES(?,?,?)`

    console.log(req.body,req.query)
    db.query(queryString,[req.session.user.strUsername, req.params.name, req.query.reason], (err, results, fields) =>{
        if(err) return console.log(err)

        return res.redirect(`/profile/${req.params.name}?reported`)
    });
});

exports.profile = profileRouter;
