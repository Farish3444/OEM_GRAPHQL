
import {Connection} from "tedious";
import { Request } from "tedious";

const sqlConfig = {
    server: "10.50.21.163",
    authentication: {
        type: "default",
        options: {
            userName: "OEMAvailability",
            password: "dsfhg#4534523!sdfg",
            database: 'CPI'
       }
    },
}

export class OEMConnection {
    async selectQuery() {
        try {
            var connection = new Connection(sqlConfig);
            connection.connect();
            connection.on('debug', function(text){
                console.log(text);
            })
            connection.on('connect', function(text){
                if(text) {
                    console.log('Error: ', text);
                }
                const table = '[CPI].[dbo].[SkuStockPricing]';
                // var sql =`SELECT * FROM  ${table}`;
                var sql =`SELECT * FROM  ${table} where SkuID='1441474'`;
                var request = new Request(sql, function(err) {
                    if (err) {
                    console.log(err);
                    } else {
                    console.log(' rows');
                    }
                });
                request.on('row', function(columns) {
                    columns.forEach(function(column) {
                    console.log(column.value);
                    });
                });
                request.on('done', function(rowCount, more) {  
                    console.log(rowCount + ' rows returned');  
                });
                connection.execSql(request);
            })
            
            
        } catch (err) {
            console.error("Connection failed: " + err);
            throw(err);
        }
    }

    executeStatement(){
        
    }
}  

const oemConnection = new OEMConnection();
export { oemConnection };
   