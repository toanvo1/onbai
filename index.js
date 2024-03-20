const express = require('express')
const app = express()
const multer = require('multer')

app.set("view engine", "ejs")
app.set("views", "./template")

app.use(express.json());
app.use(express.static('./template'));
require('dotenv').config()
const AWS = require('aws-sdk')

const path = require('path')
const { log } = require('console')

AWS.config.update({
    region: process.env.REGION,
    accessKeyId: process.env.ACCESKEY,
    secretAccessKey: process.env.SECRET,
})

const s3 = new AWS.S3()
const dynamo = new AWS.DynamoDB.DocumentClient()
const buc = process.env.BUCKET

const dyna = process.env.DYNAMO

const storage = multer.memoryStorage({
    des(req, file, cb) {
        cb(null, "")
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 2000000 },
    
})

app.get('/', async (req, res) => {  
    const data= await dynamo.scan({ TableName: dyna }).promise()
    return res.render("indexjs", {
        data: data.Items
    })
})


app.post("/add", upload.single('image'), (req, res) => {
    const image = req?.file?.originalname.split('.')
    const filefath = `${req.body.idmonHoc}_${Date.now().toString()}.${image[image.length - 1]}`
    // console.log("buc", buc);
    // console.log("filefath", filefath);
    // console.log("req.file.buffer", req.file.buffer);
    // console.log("req.file.mimetype", req.file.mimetype);
    const paramS3 = {
        Bucket: buc,
        Key: filefath,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    }
    s3.upload(paramS3, async (err, data) => {
        try {
            const imgURL = data.Location;
            const paramMongodb = {
                TableName: dyna,
                Item: {
                    _id: req.body.idmonHoc,
                    monhoc: req.body.monHoc,
                    file: `https://img1233333.s3.amazonaws.com/${filefath}`,

                }
            }
            await dynamo.put(paramMongodb).promise()
            res.redirect("/")
        } catch (error) {
            console.log(err);
            res.redirect("/")
        }
    })

 })

app.post("/delete", upload.fields([]), (req, res) => {
    const listCheckBox = Object.keys(req.body);

    if (!listCheckBox || listCheckBox.length <= 0) {
        res.redirect("/")
    }
    try {
        const handledele = (length) => {
            const params = {
                TableName: dyna,
                Key: {
                    _id: listCheckBox[length]
                }
            }
            dynamo.delete(params, (data, err) => {
                if (length > 0) {
                    handledele(length - 1)

                }
                else res.redirect("/")
            })
        }
        handledele(listCheckBox.length - 1)

    } catch (error) {
        console.log(error);
    }
})
app.listen(3000, () => {
    console.log("oke");

})