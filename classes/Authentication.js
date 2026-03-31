import jwt from 'jsonwebtoken';

export class Authentication{

  constructor(){
    this.authCookieName = 'sapienza_ltw_auth';
    this.jwt = jwt;
    this.jwt_key = 'mgivh34mf3e9328pun!ihdsSK(W4R27awJSDHJ!£!==2=';
  }

  setAuthCookie(res, userInfo){
    const sessionMaxAge = 86400; //24h
    const now = new Date();
    var token = {
      userId: userInfo.userId,
      email: userInfo.email,
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      picture: userInfo.picture,
      iat: now.getTime(),
      exp: now.getTime()
    }
    token.exp = Math.floor(Date.now() / 1000)+sessionMaxAge;
    return res
      .setHeader(
        'Set-Cookie',
        this.authCookieName+'='+this.jwt.sign(token, this.jwt_key)+'; '+
        'Max-Age='+sessionMaxAge+'; '+
        'Secure; HttpOnly'
      );
  }

  verifyAuthCookie( cookies ){
    if(!cookies || cookies==''){ return false; }
    const parseCookie = str =>
      str.split(';')
        .map(v => v.split('='))
        .reduce((acc, v) => {
          acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
          return acc;
        }, {});
    const token = parseCookie( cookies )[ this.authCookieName ];
    if(!token || token=='' || token==undefined){ return false; }
    try {
      return this.jwt.verify(token, this.jwt_key, {ignoreExpiration: false});
    } catch(errToken) {
      return false;
    }
  }

}