import mysql from 'mysql2'

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    port: 3307,
    password: "123456",
    database: "slanakajewel"
})

con.connect(function(err) {
    if(err) {
        console.log("connection error")
    } else {
        console.log("Connected")
    }
})

export default con;
