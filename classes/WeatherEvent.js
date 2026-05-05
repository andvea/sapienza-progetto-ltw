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

  getCustomer(){
    return this.customer;
  }

  getName(){
    return this.name;
  }

  getType(){
    return this.type;
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
      const customerRepository = new CustomerRepository(this.mySqlPool);

      let where = [];
      let params = [];

      if (nextCursor) {
        where.push('local_id > ?');
        params.push(nextCursor);
      }

      if (prevCursor) {
        where.push('local_id < ?');
        params.push(prevCursor);
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
        ORDER BY datetime ASC
        LIMIT ?`;

      params.push(limit);

      const res = await this.mySqlPool.query(query, params);
      var events = [];

      for (var i=0; i<res[0].length; i++) {
        let row = res[0][i];
        let eventCustomer = await customerRepository.get(row.customer_local_id);
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