const express = require('express');
const AWS = require('aws-sdk');

const app = express();
const port = 5000;

AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();
const tableName = 'boletinesTable';
const topicArn = 'arn:aws:sns:us-east-1:998275817831:boletines-topic';
const s3 = new AWS.S3();

app.get('/boletines/:boletinID', async (req, res) => {
  const { boletinID } = req.params;
  const { correoElectronico } = req.query;

  if (!correoElectronico) {
    return res.status(400).send('Falta el parámetro correoElectronico');
  }

  try {
    const result = await dynamodb.get({
      TableName: tableName,
      Key: { id: boletinID }
    }).promise();

    if (!result.Item) {
      return res.status(404).send('Boletín no encontrado');
    }

    const { imagen } = result.Item;

    const imageKey = imagen.split('/').pop(); 
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: 'practica-5-746335',
      Key: imageKey,
      Expires: 3600 
    });


    await sns.publish({
      TopicArn: topicArn,
      Subject: `Visualizacion del boletin ${boletinID}`,
      Message: `Imagen del boletin: ${signedUrl}`,
    }).promise();

    res.send(`Boletín enviado por correo a ${correoElectronico}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
