const { Connection, Request } = require('../lib/tedious');

    const config = {
        server: '10.50.21.163',
        authentication: {
        type: 'default',
        options: {
            userName: 'OEMAvailability',
            password: 'dsfhg#4534523!sdfg'
        }
        },
        options: {
        //   port: 1433 // Default Port
        database:'CPI'
        }
    };
    
    const connection = new Connection(config);
    const table = '[dbo].[SkuStockPricing]';

    connection.on('connect', function(err) {  
        // If no error, then good to proceed.  
        console.log("Connected");  
        executeStatement();  
    });  
    
    connection.connect();

    //  Example 1
    var Request = require('tedious').Request;  
    var TYPES = require('tedious').TYPES;  
    function executeStatement() {  
        request = new Request("SELECT * FROM dbo.SkuStockPricing;", function(err) {  
        if (err) {  
            console.log(err);}  
        });  
        var result = "";  
        request.on('row', function(columns) {  
            columns.forEach(function(column) {  
              if (column.value === null) {  
                console.log('NULL');  
              } else {  
                result+= column.value + " ";  
              }  
            });  
            console.log(result);  
            result ="";  
        });  
  
        request.on('done', function(rowCount, more) {  
        console.log(rowCount + ' rows returned');  
    });  
        
        // Close the connection after the final event emitted by the request, after the callback passes
        request.on("requestCompleted", function (rowCount, more) {
            connection.close();
        });
        connection.execSql(request);  
    }  

    //  Example 2
    function selectTable() {
        const sql = `SELECT * FROM  ${table}`;
        const request = new Request(sql, (err, rowCount) => {
        if (err) {
            console.log('error occured!');
            throw err;
        }
        console.log(`'${table}' created!`);
        // Call connection.beginTransaction() method in this 'new Request' call back function
        beginTransaction();
        
        });
        connection.execSql(request);
    }

    // SQL: Begin Transaction
    //--------------------------------------------------------------------------------
    function beginTransaction() {
        connection.beginTransaction((err) => {
        if (err) {
            // If error in begin transaction, roll back!
            rollbackTransaction(err);
        } else {
            console.log('beginTransaction() done');
            // If no error, commit transaction!
            commitTransaction();
        }
        });
    }
    
    // SQL: Commit Transaction (if no errors)
    //--------------------------------------------------------------------------------
    function commitTransaction() {
        connection.commitTransaction((err) => {
            if (err) {
            console.log('commit transaction err: ', err);
            }
            console.log('commitTransaction() done!');
            console.log('DONE!');
            connection.close();
        });
    }

    // SQL: Rolling Back Transaction - due to errors during transaction process.
    //--------------------------------------------------------------------------------
    function rollbackTransaction(err) {
        console.log('transaction err: ', err);
        connection.rollbackTransaction((err) => {
            if (err) {
            console.log('transaction rollback error: ', err);
            }
        });
        connection.close();
    }