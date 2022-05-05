import express = require("express");
import * as studentController from '../controllers/studentController';

const router = express.Router();

router
    .route('/')
    .get(studentController.getStudent);

    module.exports = router;