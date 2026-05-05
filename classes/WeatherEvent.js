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

}