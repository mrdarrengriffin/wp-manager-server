// Define environment variable defaults
// Falsy values mean that the user must provide a value
const envDefaults = {
    SERVER_HOST: "localhost",
    SERVER_PORT: 443,
    CORS_ALLOWED_ORIGINS: "https://localhost:5173",
    CERTIFICATE_CERT: "certs/cert.pem",
    CERTIFICATE_KEY: "certs/key.pem",
    SERVER_URL: false
};

// Set environment variables to defaults if they are not already set
Object.keys(envDefaults).forEach((key) => {
    if (!process.env[key]) {
        if(!envDefaults[key]) {
            throw new Error(`Missing required environment variable ${key}`);
        }

        console.info(`Setting environment variable ${key} to default value ${envDefaults[key]}`);

        process.env[key] = envDefaults[key];
    }
});

import fs from "fs";

// More specific environment variable checks
if(!fs.existsSync(process.env.CERTIFICATE_CERT)) {
    throw new Error(`Certificate file ${process.env.CERTIFICATE_CERT} does not exist`);
}
if(!fs.existsSync(process.env.CERTIFICATE_KEY)) {
    throw new Error(`Certificate file ${process.env.CERTIFICATE_KEY} does not exist`);
}


// Import required modules
import express from "express";
import https from "https";
import mongoose from "mongoose";
import routes from "./routes";
import cors from "cors";
import cookieParser from "cookie-parser";

import User from "./models/user";
import Site from "./models/site";

import PluginManager from "./plugins/plugin-manager";
import { WPEngineAuth, WPEngineSite } from "./models/wpengine";

mongoose.connect("mongodb://localhost:27017/test");

const app = express();
app.use(cookieParser());
app.use(express.urlencoded());
app.use(express.json());

app.use(
    cors({
        origin: process.env.CORS_ALLOWED_ORIGINS.split(","),
        credentials: true,
    })
);

PluginManager.load();
PluginManager.plugins.forEach((plugin) => {
    app.use(
        `/plugins/${plugin.name.replace(" ", "-").toLowerCase()}`,
        plugin.getRoutes()
    );
});

app.use(routes);

const server = https.createServer({
    key: fs.readFileSync(process.env.CERTIFICATE_KEY),
    cert: fs.readFileSync(process.env.CERTIFICATE_CERT),
},app);

server.listen(process.env.SERVER_PORT, () => {
    console.log(`Server listening on port ${process.env.SERVER_PORT}`);
});

async function sampleData() {
    // Check if sample data is present in the env
    if (!process.env.SAMPLE_USER || !process.env.SAMPLE_SITE) {
        console.error("Not inserting sample data due to missing env vars");
        return;
    }

    let user = await User.findOne({
        username: process.env.SAMPLE_USER,
    });

    if (!user) {
        user = new User({
            username: process.env.SAMPLE_USER,
        });
        await user.save();
    }

    let site = await Site.findOne({
        uri: process.env.SAMPLE_SITE,
    });

    if (!site) {
        site = new Site({
            uri: process.env.SAMPLE_SITE,
            user,
        });
        await site.save();
    }

    user.sites.push(site);
    await user.save();

    if(process.env.SAMPLE_WPENGINE_APIKEY) {
        const wpeAuth = new WPEngineAuth({
            user,
            auth: process.env.SAMPLE_WPENGINE_APIKEY,
        });
        await wpeAuth.save();
        user.wpengineAuth = wpeAuth;
        await user.save();
    }

    if(process.env.SAMPLE_WPENGINE_INSTALL_ID) {
        site.wpeInstallId = process.env.SAMPLE_WPENGINE_INSTALL_ID;
        await site.save();
    }
}

sampleData();
