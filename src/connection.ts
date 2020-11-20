import { config } from './config/config';
import mySql from 'mysql'


const connection = mySql.createConnection({
    user: config.username,
    password: config.password,
    database: config.database,
    host: config.host
})

connection.connect()
connection.on('connect', (err) => {
    if (err) {
        console.log(err);
        
        throw new Error(err)
    }

    console.log('Connected');

})

export default connection

