const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
require('dotenv').config()
const monk = require('monk')
const { nanoid } = require('nanoid');
const yup = require('yup')
let urls;

const app = express()
const db = monk('badsha:password@localhost:27017/url_shortener', function (err, db) {
    if (err) {
        console.error("Db is not connected", err.message);
    }
    if (db) {
        db.addMiddleware(logger)
        db.addMiddleware(crashReporter)

        urls = db.get('url')
        urls.createIndex({ slug: 1 }, { unique: true })
    }
})
app.use(helmet())
app.use(morgan('tiny'))
app.use(cors())
app.use(express.json())
const logger = context => next => (args, method) => {
    console.log(method, args)
    return next(args, method).then((res) => {
        console.log(method + ' result', res)
        return res
    })
}

const crashReporter = context => next => (args, method) => {
    return next(args, method).catch((err) => {
        console.error('Caught an exception!', err)
        Raven.captureException(err, {
            extra: {
                method,
                args
            }
        })
        throw err
    })
}


let schema = yup.object().shape({
    slug: yup.string().trim().matches(/^[\w\-]+$/i),
    url: yup.string().trim().url().required(),
})
app.get('/', (req, res, next) => {
    res.json({ message: 'Welcome to nodejs server' })
})

app.get('/:id', async (req, res) => {
    const { id: slug } = req.params;
    try {
        const url = await urls.findOne({ slug });
        if (url) {
            return res.redirect(url.url);
        }
        return res.status(404).json({ message: 'Error' });
    } catch (error) {
        return res.status(404).json({ message: 'Error' });
    }
})

app.post('/url', async (req, res, next) => {
    let { slug, url } = req.body;
    try {
        await schema.validate({
            slug,
            url
        })
        if (!slug) {
            slug = nanoid(5);
        } else {
            const existing = await urls.findOne({ slug });
            if (existing) {
                throw new Error('Slug in use.');
            }
        }
        slug = slug.toLowerCase();
        const newUrl = {
            url,
            slug
        };
        console.log(newUrl)
        const created = await urls.insert(newUrl);
        res.json(created);
    } catch (err) {
        next(err);
    }
})

// app.get('/url/:id', (req, res) => {
//     //TODO: get url by id
// })

app.use((error, req, res, next) => {
    if (error.status) {
        res.status(error.status);
    } else {
        res.status(500);
    }
    res.json({
        message: error.message,
        stack: error.stack,
    });
})

const port = process.env.port || 3123;
app.listen(port, () => {
    console.log(`Server is listening at ${port}`)
})