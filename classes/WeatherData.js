export class WeatherData {
  constructor(datetime, temperature_c, dewpoint_c, pressure_hpa, humidity_percent) {
    this.datetime = datetime;
    this.temperature_c = temperature_c;
    this.dewpoint_c = dewpoint_c;
    this.pressure_hpa = pressure_hpa;
    this.humidity_percent = humidity_percent;
  }

  getDatetime(){
    return this.datetime;
  }

  getTemperature(){
    return this.temperature_c;
  }

  getDewpoint(){
    return this.dewpoint_c;
  }

  getPressure(){
    return this.pressure_hpa;
  }

  getHumidity(){
    return this.humidity_percent;
  }
}

export class WeatherDataRepository {
	constructor(mySqlPool) {
    this.mySqlPool = mySqlPool;
  }

  async list(datetimeFrom = null, datetimeTo = null) {
    try {
      let where = [];
      let params = [];

      if (datetimeFrom) {
        where.push('datetime >= STR_TO_DATE(?, "%Y-%m-%dT%H:%i")');
        params.push(datetimeFrom);
      }

      if (datetimeTo) {
        where.push('datetime <= STR_TO_DATE(?, "%Y-%m-%dT%H:%i")');
        params.push(datetimeTo);
      }

      const query = `
        SELECT *
        FROM ${global.ENV.DATABASE_DATA_TABLE}
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY datetime ASC`;

      const res = await this.mySqlPool.query(query, params);
      var dataset = [];

      for (var i=0; i<res[0].length; i++) {
        let row = res[0][i];
        let data = new WeatherData(row.datetime, row.temperature_c, row.dewpoint_c,
            row.pressure_hpa, row.humidity_percent);
        dataset.push(data);
      }

      return dataset;
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