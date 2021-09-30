var db = connect("mongodb://root:example@localhost:27017/admin");

db = db.getSiblingDB('url_shortener'); // we can not use "use" statement here to switch db

db.createUser(
    {
        user: "badsha",
        pwd: "example",
        roles: [ { role: "readWrite", db: "url_shortener"} ],
        passwordDigestor: "server",
    }
)