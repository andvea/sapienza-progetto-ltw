#!/usr/bin/env nodejs

import express from 'express';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

import {Authentication} from './classes/Authentication.js';
import {Customer, CustomerRepository} from './classes/Customer.js';
import {WeatherEvent, WeatherEventRepository} from './classes/WeatherEvent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

dotenv.config({ path: './.env.dev' });
global.ENV = process.env;

var mysqlPool = mysql.createPool({
  connectionLimit : 100,
  user            : global.ENV.DATABASE_USER,
  password        : global.ENV.DATABASE_PASSWORD,
  database        : global.ENV.DATABASE_DATABASE,
  host            : global.ENV.DATABASE_HOST,
  port            : global.ENV.DATABASE_PORT
});

const customerRepository = new CustomerRepository(mysqlPool);
const weatherEventRepository = new WeatherEventRepository(mysqlPool);
const authentication = new Authentication();

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
app.use('/static', express.static('static'));

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

  if (req.path != '/signin' && req.path != '/signup' && !req.AUTH_MIDDLEWARE.userInfo) {
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

app.get('/signup', async function(req, res){
  res.sendFile(__dirname+'/views/signup.html');
});

app.post('/signin', async function(req, res){
  const email = req.body.email;
  const pwd = req.body.pwd;

  if (!email || !pwd){
    return res.redirect('/signin?errCode=400');
  }

  try{
    var customer = await customerRepository.find(email, pwd);

    if (!customer) {
      return res.redirect('/signin?errCode=401');
    }

    var userInfo = {
      userId: customer.getId(),
      email: customer.getEmail(),
      first_name: customer.getFirstName(),
      last_name: customer.getLastName(),
      picture: customer.getProfilePic()
    }

    authentication.setAuthCookie( res, userInfo );
    return res.redirect((req.query.redirectTo ? req.query.redirectTo : '/admin/home'));
  } catch(err) {
    let errCode = (err.cause && err.cause.errorCode ? err.cause.errorCode : 500);
    return res.redirect('/signin?errCode='+errCode);
  }
});

app.post('/signup', async function(req, res){
  const firstName = req.body.first_name;
  const lastName = req.body.last_name;
  const profilePic = req.body.profile_pic;
  const email = req.body.email;
  const pwd = req.body.pwd;

  if (!email || !pwd){
    return res.redirect('/signup?errCode=400');
  }

  try{
    var customer = new Customer(null);

    customer.setFirstName(firstName);
    customer.setLastName(lastName);
    customer.setProfilePic(profilePic);
    customer.setEmail(email);
    customer.setPwd(Customer.hashPwd(pwd));

    customer = await customerRepository.create(customer);

    return res.redirect('/signin');
  } catch(err) {
    let errCode = (err.cause && err.cause.errorCode ? err.cause.errorCode : 500);
    return res.redirect('/signup?errCode='+errCode);
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

app.get('/settings', async function(req, res){
  var customer = new Customer(req.AUTH_MIDDLEWARE.userInfo.userId);
  await customerRepository.getSettings(customer);
  var customerSettings = (customer.getSettings() ? customer.getSettings() : {});
  return res.status(200).send(customerSettings);
});

app.post('/settings/:entity', async function(req, res){
  var customer = new Customer(req.AUTH_MIDDLEWARE.userInfo.userId);

  try {
    switch (req.params.entity) {
      case 'charts':
        await customerRepository.saveSetting(customer, req.params.entity, JSON.stringify(req.body));
        return res.sendStatus(200);
        break;
      default:
        return res.status(400).send('This entity doesn\'t exists');
        break;
    }
  } catch(err) {
    let errCode = (err.cause && err.cause.errorCode ? err.cause.errorCode : 500);
    return res.status(errCode).send('An error occurred');
  }
});

app.post('/events', async function(req, res){
  var customer = new Customer(req.AUTH_MIDDLEWARE.userInfo.userId);

  if (!req.body.name || !req.body.type || !req.body.datetime) {
    return res.status(400).send('Missing required fields');
  }

  var event = new WeatherEvent(null, customer, req.body.name, req.body.type, req.body.datetime);
  event.setDescription(req.body.description);

  try{
    await weatherEventRepository.create(event);
    return res.sendStatus(200);
  } catch(err) {
    let errCode = (err.cause && err.cause.errorCode ? err.cause.errorCode : 500);
    return res.status(errCode).send('An error occurred');
  }
})