import app from "./config/app";
// import env from './env'
import './db/persistable/setup-time-measure'
const PORT = 3000;
app.listen(PORT, () => {
   console.log('Express server listening on port ' + PORT);
});