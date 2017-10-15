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

        verify(req.body)

        function verify(body){
            db.query(`SELECT * FROM tblban WHERE strBannedUserName = ? AND boolIsUnbanned != 1`,[body.username], (err, results, fields) =>{
                if (err) return console.log(err)

                if (results.length === 1) return res.redirect('/login?banned');

                else return login(body); 
            });
        }

        function login(body){
            db.query(`SELECT * FROM tbluser WHERE strUsername="${body.username}"`, (err, results, fields) => {
                if (err) throw err;
                if (results.length === 0) return res.redirect('/login?incorrect');
    
                var user = results[0];
                console.log(user);
                if (user.strPassword !== req.body.password) return res.redirect('/login?incorrect');
    
                delete user.strPassword;
    
                req.session.user = user;
                
                if(user.charUserType == 'T')return res.redirect('/tutor');
                else if (user.charUserType == 'S') return res.redirect('/student');
                else if (user.charUserType == 'A') return res.redirect('/admin');
    
            });
        }
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
        if (err) return console.log(err);

        return db.query(queryString2, ['T', req.body.username, req.body.rate, req.body.achievements], (err, results, fields) =>{
            if (err) return console.log(err);

            return addSubjects(tutorSubjects,queryString3,queryString4,req.body.username, function() {
                res.redirect('/login?success')
            });
        });
    });

    var queryString3 = `INSERT INTO tblsubjects(strSubjectCode,strSubjectDesc) VALUES(?,?)`
    var tutorSubjects = req.body.subjects.split(',');
    var queryString4 = `INSERT INTO tbltutorteaches (strTutorUserName,strSubjectCode) VALUES(?,?)`
    function addSubjects(subjects,insrtToTblSubj,insrtToTutorTeaches,username,callback){
        var subject = subjects.pop();
        subject = subject.toUpperCase();
        console.log(subject);
        verify(subject,insrtToTblSubj,insrtToTutorTeaches,username, function() {
            console.log(subject.length);
            if(subjects.length > 0) return addSubjects(subjects,insrtToTblSubj,insrtToTutorTeaches, username, callback)
            return callback();
        });
    }
    function verify(subjectDesc, insrtToTblSubj, insrtToTutorTeaches, username, callback){
        db.query('SELECT * FROM tblsubjects WHERE strSubjectDesc = ?', [subjectDesc], (err, results, fields) =>{
            if(err) return console.log(err)
            console.log(results[0]);
            console.log(results.length);
            if(results.length > 0){
                return addSubjectToTblTutorTeaches(results[0].strSubjectCode, insrtToTutorTeaches, username, function() {
                    return callback();
                });
            } 
            else{
                return getSubjectCode(subjectDesc,insrtToTblSubj,insrtToTutorTeaches,username,function() {
                    return callback();
                });
            }
        });
    }
    function getSubjectCode(subject, insrtToTblSubj, insrtToTutorTeaches,username, callback){
        db.query(`select count(strSubjectCode) as subjCount from tblsubjects`, (err, results, fields)=>{
            var x = results[0].subjCount;
            var subjCode = "SUBJ" + x;
            console.log("x is "+subjCode);
            addSubjectToTblSubject(subjCode,subject,insrtToTblSubj, insrtToTutorTeaches, username, function() {
                return callback();
            });
        });
    }
    function addSubjectToTblSubject(subjCode,subjDesc,insrtToTblSubj,insrtToTutorTeaches, username, callback){
        db.query(insrtToTblSubj, [subjCode,subjDesc], (err, results, fields) =>{
            if (err) return console.log(err)

            console.log('subject added to table');
            return addSubjectToTblTutorTeaches(subjCode,insrtToTutorTeaches,username, function() {
                return callback();
            });
        });
    }
    function addSubjectToTblTutorTeaches(subjCode,insrtToTutorTeaches,username,callback){
        db.query(insrtToTutorTeaches,[username, subjCode], (err, results, fields) =>{
            if (err) return console.log(err);

            console.log("Subject added to tutor");
            return callback();
        })
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
exports.login = loginRouter;
exports.logout = logoutRouter;
exports.signup = signupRouter;