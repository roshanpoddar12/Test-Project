import express = require("express");
import * as resourceController from '../controllers/resourceController';

const router = express.Router();

router
    .route('/sync')
    .get(resourceController.syncResources);

    module.exports = router;