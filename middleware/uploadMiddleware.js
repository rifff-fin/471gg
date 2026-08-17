const multer = require("multer");


const storage = multer.memoryStorage();



const fileFilter = (req, file, callback) => {

  const allowedTypes = [
    "image/",
    "video/"
  ];


  const isAllowed = allowedTypes.some(type =>
    file.mimetype.startsWith(type)
  );


  if (isAllowed) {

    callback(null, true);

  } else {

    callback(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        file.fieldname
      )
    );

  }

};



const upload = multer({

  storage,

  fileFilter,

  limits: {

    fileSize: 50 * 1024 * 1024, // 50 MB

    files: 1

  }

});


module.exports = upload;