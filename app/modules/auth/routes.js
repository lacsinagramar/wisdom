var express = require('express');
var loginRouter = express.Router();
var logoutRouter = express.Router();
var signupRouter = express.Router();

var authMiddleware = require('./middlewares/auth');

loginRouter.route('/')
    .get(authMiddleware.noAuthed, (req, res) => {
        res.render('auth/views/login', req.query);
    })
    .post((req, res) => {
        var db = require('../../lib/database')();

        db.query(`SELECT * FROM tbluser WHERE strUsername="${req.body.username}"`, (err, results, fields) => {
            if (err) throw err;
            if (results.length === 0) return res.redirect('/login?incorrect');

            var user = results[0];
            console.log(user);
            if (user.strPassword !== req.body.password) return res.redirect('/login?incorrect');

            delete user.strPassword;

            req.session.user = user;
            
            if(user.charUserType == 'T')return res.redirect('/tutor');
            else if (user.charUserType == 'S') return res.redirect('/student');

        });
    });

logoutRouter.get('/', (req, res) => {
    req.session.destroy(err => {
        if (err) throw err;
        res.redirect('/login');
    });
});

// GET REQUESTS
signupRouter.get('/', (req,res) =>{
    res.render('auth/views/signup');
});

signupRouter.get('/tutor', (req,res) =>{
    res.render('auth/views/signupTutor');
});

signupRouter.get('/student', (req,res) =>{
    res.render('auth/views/signupStudent');
});

// POST REQUESTS
signupRouter.post('/tutor', (req,res) =>{
    var db = require('../../lib/database')();
    var queryString = `INSERT INTO tbluser VALUES(?,?,?,?,?,?,?)`;
    var queryString2 = `INSERT INTO tbltutor VALUES(?,?,?,?)`;
    

    var contactInfo = req.body.cellphone + '/' + req.body.telephone;
    db.query(queryString, [req.body.username, req.body.password, req.body.firstname, req.body.lastname, req.body.birthday, contactInfo, 'T'], (err, results, fields) =>{
        if (err) throw err;

        db.query(queryString2, ['T', req.body.username, req.body.rate, req.body.achievements], (err, results, fields) =>{
            if (err) throw err;

            res.redirect('/login?success');
        });
    });

    var queryString3 = `INSERT INTO tblsubjects VALUES(?,?)`
    var tutorSubjects = req.body.subjects;
    var queryString4 = `INSERT INTO tbltutorteaches (strTutorUserName,strSubjectCode) VALUES(?,?)`
    var subjCode;
    tutorSubjects = tutorSubjects.toUpperCase();
    var x;
    eme1(tutorSubjects,queryString3,queryString4,req.body.username);
    function eme1(keme1,keme2,keme3,keme4){
        db.query(`select count(strSubjectCode) as subjCount from tblsubjects`, (err, results, fields)=>{
            x = results[0].subjCount;
            subjCode = "SUBJ" + x;
            console.log("x is "+subjCode);
            eme2 (keme1,subjCode,keme2,keme3,keme4)
        });
    }
    function eme2(keme1,x,keme2,keme3,keme4){
        myQuery(keme1,x,keme2,keme3,keme4);
    }
});

signupRouter.post('/student', (req,res) =>{
    var db = require('../../lib/database')();
    var queryString = `INSERT INTO tbluser VALUES(?,?,?,?,?,?,?)`;
    var queryString2 = `INSERT INTO tblstudent VALUES(?,?)`;

    console.log(req.body)
    var contactInfo = req.body.cellphone + '/' + req.body.telephone;
    db.query(queryString, [req.body.username, req.body.password, req.body.firstname, req.body.lastname, req.body.birthday, contactInfo, 'S'], (err, results, fields) =>{
        if (err) throw err;

        db.query(queryString2, ['S', req.body.username,], (err, results, fields) =>{
            if (err) throw err;

            res.redirect('/login?success');
        });
    });
});

function myQuery(subjectDesc, subjCode, queryString3, queryString4, username){
    var db = require('../../lib/database')();
    db.query(`SELECT * from tblsubjects WHERE strSubjectDesc = ?`, [subjectDesc], (err, results, fields)=>{
        if(err) return console.log(err);
        
        if(results.length !==0){
            db.query(queryString4,[username,results[0].strSubjectCode], (err, results, fields) =>{
                if(err) return console.log(err);

                console.log('SUBJECTS ADDED TO TUTOR')
            });
        }
        else{
            console.log(subjectDesc);
            db.query(queryString3,[subjCode, subjectDesc], (err, results, fields) =>{
                if(err) return console.log(err);

            db.query(`SELECT * from tblsubjects WHERE strSubjectDesc = ?`, [subjectDesc], (err, results, fields)=>{
                if(err) return console.log(err);
                
                db.query(queryString4,[username,results[0].strSubjectCode], (err, results, fields)=>{
                    if(err) return console.log(err);

                    console.log('SUBJECTS ADDED TO TUTOR')
                });
                });
            });
        }
    });
}

// function countSubjects(){
//     var final;
//     var db = require('../../lib/database')();
//     db.query(`select count(strSubjectCode) as subjCount from tblsubjects`, (err, results, fields)=>{
//         var x = results[0].subjCount;
//         var y = "SUBJ" + x;
//         console.log(y);
//         balik(y)
//     });
//     function balik(pangreturn){
//         final = pangreturn;
//         console.log("Final: "+final);
//     }
//     console.log("irereturn na si "+final);
//     return final;
// }

exports.login = loginRouter;
exports.logout = logoutRouter;
exports.signup = signupRouter;