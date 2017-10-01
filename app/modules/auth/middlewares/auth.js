exports.hasAuth = (req, res, next) => {
    if (req.session && req.session.user && Object.keys(req.session.user).length > 0) return next();
    return res.redirect('/login?unauthorized');
}

exports.noAuthed = (req, res, next) => {
    if (req.session && req.session.user && Object.keys(req.session.user).length > 0) return res.redirect('/');
    return next();
}

exports.isStudent = (req, res, next) => {
    if (req.session && req.session.user && Object.keys(req.session.user).length > 0 && req.session.user.charUserType === 'S') return next();
    return res.redirect('/index?notStudent');
}

exports.isTutor = (req, res, next) => {
    if (req.session && req.session.user && Object.keys(req.session.user).length > 0 && req.session.user.charUserType === 'T') return next();
    return res.redirect('/index?notTutor');
}

exports.authTransac = (req, res, next) => {
    if (req.session && req.session.user && Object.keys(req.session.user).length > 0){
        var db = require('../../../lib/database')();

        db.query(`SELECT * from tbloffer JOIN tblrequest ON tbloffer.intRequestID = tblrequest.intRequestID where tbloffer.intOfferID = ?`,[req.session.transac], (err, results, fields) =>{
            if(err) return console.log(err);

            if(results.length === 0) return res.redirect('/index?error');
            else if(results[0].strStudentUserName === req.session.user.strUsername && results[0].charStatusRequest === 'P' && results[0].charStatusOffer === 'P'){
                delete req.session.transac
                console.log('Deleted Transac:\n'+req.session)
                return next();
            } 
                
            return res.redirect('/index?error');
        });
    }
}