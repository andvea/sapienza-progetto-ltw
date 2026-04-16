export class Customer {
  static hashPwd(pwd){
    return pwd;
  }

  constructor(id) {
    this.id = id;
  }

  setId(id){
    this.id = id;
  }

  getId(){
    return this.id;
  }
  
  getEmail(){
    return this.email;
  }

  setEmail(email){
    this.email = email;
  }

  getPwd(){
    return this.pwd;
  }

  setPwd(pwd){
    this.pwd = pwd;
  }

  getFirstName(){
    return this.first_name;
  }

  setFirstName(firstName){
    this.first_name = firstName;
  }

  getLastName(){
    return this.last_name;
  }

  setLastName(lastName){
    this.last_name = lastName;
  }

  getProfilePic(){
    return this.profile_pic;
  }

  setProfilePic(profilePic){
    this.profile_pic = profilePic;
  }

  getSettings(){
    return this.settings;
  }

  setSetting(name, value){
    this.settings = (!this.settings ? {} : this.settings);
    this.settings[name] = value;
  }
}

export class CustomerRepository {
	constructor(mySqlPool) {
    this.mySqlPool = mySqlPool;
  }

  async find(email = null, pwd = null) {
    try {
      var customerFromDb = await this.mySqlPool.query(`
        SELECT * 
        FROM ${global.ENV.DATABASE_CUSTOMERS_TABLE} 
        WHERE email = ? AND pwd = ?
        LIMIT 1`,
        [email, pwd]);

      if (customerFromDb[0].length==1) {
        var c = new Customer(customerFromDb[0][0].local_id);
        c.setEmail(customerFromDb[0][0].email);
        c.setFirstName(customerFromDb[0][0].first_name);
        c.setLastName(customerFromDb[0][0].last_name);
        c.setProfilePic(customerFromDb[0][0].profile_pic);

        return c;
      } else {
        return null;
      }

    } catch(dbError) {
      throw new Error('Can\'t find customer', {
        cause: {
          errorCode: 500, 
          originError: dbError
        }
      });
    }
  }

  async create(customer) {
    try {
      var res = await this.mySqlPool.query(`
        INSERT INTO 
          ${global.ENV.DATABASE_CUSTOMERS_TABLE}
          (email, pwd, first_name, last_name, profile_pic)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE email = email`,
        [
          customer.getEmail(),
          customer.getPwd(),
          customer.getFirstName(), 
          customer.getLastName(),
          customer.getProfilePic()
        ]);

      if (!res[0].insertId) {
        throw new Error('Customer already exists', {
          cause:{ errorCode: 409, originError: null }
        });
      }

      customer.setId(res[0].insertId);

      return customer;
    } catch(dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

  async getSettings(customer) {
    try {
      var res = await this.mySqlPool.query(`
        SELECT *
        FROM ${global.ENV.DATABASE_CUSTOMERS_SETTINGS_TABLE}
        WHERE customer_local_id = ?`,
        [customer.getId()]);

      for (var i=0; i<res[0].length; i++) {
        customer.setSetting(res[0][i].name, res[0][i].value);
      }

      return customer;
    } catch(dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

  async saveSetting(customer, settingName, settingValue) {
    try {
      var res = await this.mySqlPool.query(`
        INSERT INTO
          ${global.ENV.DATABASE_CUSTOMERS_SETTINGS_TABLE} 
          (customer_local_id, name, value) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE value = ?`,
        [
          customer.getId(),
          settingName,
          settingValue,
          settingValue
        ]);

      customer.setSetting(settingName, JSON.parse(settingValue));

      return customer;
    } catch(dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

}