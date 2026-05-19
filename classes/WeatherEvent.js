import {Customer, CustomerRepository} from './Customer.js';

export class WeatherEvent {
  constructor(id, customer, name, type, datetime) {
    this.id = id;
    this.customer = customer;
    this.name = name;
    this.type = type;
    this.datetime = datetime;
  }

  setId(id){
    this.id = id;
  }

  getId(){
    return this.id;
  }

  setCustomer(customer){
    this.customer = customer;
  }

  getCustomer(){
    return this.customer;
  }

  setName(name){
    this.name = name;
  }

  getName(){
    return this.name;
  }

  setType(type){
    this.type = type;
  }

  getType(){
    return this.type;
  }

  setDatetime(datetime){
    this.datetime = datetime;
  }

  getDatetime(){
    return this.datetime;
  }

  getDescription(){
    return this.description;
  }

  setDescription(description){
    this.description = description;
  }
}

export class WeatherEventRepository {
	constructor(mySqlPool) {
    this.mySqlPool = mySqlPool;
    this.customerRepository = new CustomerRepository(this.mySqlPool);
  }

  async get(event){
    try {
      var eventFromDb = await this.mySqlPool.query(`
        SELECT * 
        FROM ${global.ENV.DATABASE_EVENTS_TABLE} 
        WHERE local_id = ? 
        LIMIT 1`,
        [
          event.getId()
        ]);

      if (eventFromDb[0].length==1) {
        let row = eventFromDb[0][0];
        let e = new WeatherEvent(row.local_id);
        let eventCustomer = await this.customerRepository.get(row.customer_local_id);

        e.setCustomer(eventCustomer);
        e.setName(row.name);
        e.setType(row.type);
        e.setDatetime(row.datetime);
        e.setDescription(row.description);

        return e;
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

  async delete(event){
    try {
      var res = await this.mySqlPool.query(`
        DELETE FROM  
          ${global.ENV.DATABASE_EVENTS_TABLE}
        WHERE local_id = ?`,
        [
          event.getId()
        ]);

      return (res.affectedRows === 0 ? false : true);
    } catch(dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

  async create(event) {
    try {
      var res = await this.mySqlPool.query(`
        INSERT INTO 
          ${global.ENV.DATABASE_EVENTS_TABLE}
          (customer_local_id, name, type, datetime, description)
        VALUES (?, ?, ?, ?, ?)`,
        [
          event.getCustomer().getId(),
          event.getName(),
          event.getType(), 
          event.getDatetime(),
          event.getDescription()
        ]);

      if (!res[0].insertId) {
        throw new Error('Can\'t create event', {
          cause:{ errorCode: 409, originError: null }
        });
      }

      event.setId(res[0].insertId);

      return event;
    } catch(dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

  async list(customer = null, prevCursor = null, nextCursor = null, limit = 20,
      datetimeFrom = null, datetimeTo = null, type = null) {
    try {
      let where = [];
      let params = [];
      let orderBy = 'ASC';

      if (nextCursor!=null) {
        where.push('local_id > ?');
        params.push(nextCursor);
      } else {
        where.push('local_id < ?');
        params.push(prevCursor);
        orderBy = 'DESC';
      }

      if (customer) {
        where.push('customer_local_id = ?');
        params.push(customer.getId());
      }

      if (datetimeFrom) {
        where.push('datetime >= STR_TO_DATE(?, "%Y-%m-%dT%H:%i")');
        params.push(datetimeFrom);
      }

      if (datetimeTo) {
        where.push('datetime <= STR_TO_DATE(?, "%Y-%m-%dT%H:%i")');
        params.push(datetimeTo);
      }

      if (type) {
        where.push('type = ?');
        params.push(type);
      }

      const query = `
        SELECT *
        FROM ${global.ENV.DATABASE_EVENTS_TABLE}
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY local_id ${orderBy}
        LIMIT ?`;

      params.push(limit);

      const res = await this.mySqlPool.query(query, params);
      var events = [];

      for (var i=0; i<res[0].length; i++) {
        let row = res[0][i];
        let eventCustomer = await this.customerRepository.get(row.customer_local_id);
        let event = new WeatherEvent(row.local_id, eventCustomer, row.name, 
            row.type, row.datetime);
        event.setDescription(row.description);
        events.push(event);
      }

      return events;
    } catch (dbError) {
      throw new Error((dbError.message ? dbError.message : 'An error occurred with db'), {
        cause: {
          errorCode: (dbError.cause && dbError.cause.errorCode ? dbError.cause.errorCode : 500),
          originError: dbError
        }
      });
    }
  }

}