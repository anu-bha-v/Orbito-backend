const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

app.use(express.json());
app.use(cors());




// Databse connection with momgodb

mongoose.connect("mongodb+srv://anubhavverma9919:anubhav13@cluster0.slerlu2.mongodb.net/e-com")

//  api creation

app.get("/",(req,res)=>{
    res.send("express app is running")
})

// image storage engine

const storage = multer.diskStorage({
    destination: '/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// creating upload endpoint for images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://orbito-backend.onrender.com/images/${req.file.filename}`
    })
})

// schea for creating product

const Product = mongoose.model("product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    }
})

app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array=products.slice(-1);
        let last_product=last_product_array[0];
        id=last_product.id+1;
    }
    else{
        id=1;
    }
    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// creating api for del products

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// creating api for getting all products

app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All product fetched");
    res.send(products);
})

// schema creating for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//  creating endpoint for regestring the user

app.post('/signup',async(req,res)=>{

    let check = await Users.findOne({email:req.body.email});  //cheking if user already having acc or not
    if(check){
        return res.status(400).json({success:false,errors:" an account already exists with this email address"})
    }
    let cart ={}; // if there is no user createing empty cart
    for (let i = 0; i < 300; i++) {
        cart[i]=0;
    }
    const user = new Users({  //creating user
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save(); // save to momgodb

    const data ={  // creating token 
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');  //generating token
    res.json({success:true,token})
})

// creating endpoint for userlogin

app.post('/login' , async(req,res)=>{
    let user= await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token:token});
        }
        else{
            res.json({success:false,errors:"Your password is incorrect"});
        }
    }
    else{
        res.json({success:false,errors:"We cannot find an account with that email"});
    }
})

// creating endpoinds for new collection data

app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

// creating endpoint for popular in women section

app.get('/popularinwomen', async(req,res)=>{
    let products = await Product.find({category:"women"})
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women)
})

// creating middleware to fetch user

const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        req.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user= data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"Please authenticate using valid token"})
        }
    }

}

//  creatinf ndpoint for adding product in cartdata

app.post('/addtocart',fetchUser,async (req,res)=>{
    // console.log(req.body,req.user);
    console.log("added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added")
})

// creating end point to remove product form cartdata

app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Removed")

})

// creating endpoint toget cart data

app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData=await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if(!error){
        console.log("server running on port"+ port)
    }
    else{
        console.log("Error : " +error)
    }
})