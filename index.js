const express=require("express");
const path = require('path')
const{connectToMongoDB}=require("./connect")

const urlRoute=require("./routes/url");
const URL = require("./models/url");

const staticRoute = require('./routes/staticRouter')

const app = express();


const PORT=8001;

connectToMongoDB("mongodb://localhost:27017/short-url")
.then(()=>console.log("MongoDB connected!"))

app.set("view engine","ejs");
app.set('views',path.resolve("./views")); 

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/url",urlRoute);
app.use("/",staticRoute);

app.get("/:shortId",async(req,res)=>{
       const shortId=req.params.shortId;
       const entry=await URL.findOneAndUpdate({
           shortId
       },{$push:{ 
        visitHistory:{
            timestamp:Date.now(),
        },
       }});

       if(!entry) {
        return res.status(404).send("Short URL not found");
       }
       res.redirect(entry.redirectURL);
});




app.listen(PORT,()=>console.log(`Server started a PORT:${PORT}`))

