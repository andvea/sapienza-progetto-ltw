#!/usr/bin/env nodejs

import express from 'express';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {Authentication} from './classes/Authentication.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({
  limit: '50mb',
  verify: (req,res,buf) => {
    req.rawBody = buf
  }
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use('/static', express.static('/static'));

const authentication = new Authentication();

const port = process.env.PORT || 8080;
const server = app.listen(port, 'localhost');

app.use(function (req, res, next){
  if (req.method == 'POST' && req.path == '/signin') {
    return next();
  }
  
  const USER_INFO = authentication.verifyAuthCookie(req.headers.cookie);

  req.AUTH_MIDDLEWARE = {
    userInfo: (USER_INFO ? USER_INFO : null)
  }

  if (req.path == '/signin' && req.method == 'GET' && req.AUTH_MIDDLEWARE.userInfo) {
    return res.redirect('/admin/home');
  }

  if (!(req.path == '/signin' && req.method == 'GET') && !req.AUTH_MIDDLEWARE.userInfo) {
    return res.redirect('/signin?redirectTo='+req.path);
  }

  next();
});

app.get('/', function(req, res){
  return res.sendStatus(404);
});

app.get('/signin', async function(req, res){
  res.sendFile(__dirname+'/views/signin.html');
});

app.post('/signin', async function(req, res){
  if (req.query.test=='1') {
    var userInfo = {
      userId: 1,
      email: 'pxxxxxx.1xxxxx0@studenti.uniroma1.it',
      first_name: 'Andrea',
      last_name: 'P',
      picture: 'https://placehold.co/32x32/fc4b92/white'
    }

    authentication.setAuthCookie( res, userInfo );
    return res.redirect((req.query.redirectTo ? req.query.redirectTo : '/admin/home'));
  } else {
    return res.redirect('/signin');
  }
});

app.get('/admin', async function(req, res){
  return res.redirect('/admin/home');
});

app.get('/admin/:page', async function(req, res){
  if(req.xhr){
    res.sendFile(__dirname+'/views/parts/'+req.params.page+'.html');
  }else{
    res.sendFile(__dirname+'/views/dashboard.html');
  }
});