require('dotenv').config();
const express = require('express');
const router = express.Router();
const { SessionsClient } = require('@google-cloud/dialogflow');  // @google-cloud/dialogflow���� SessionsClient ��������
const sessionClient = new SessionsClient();  // Ŭ���̾�Ʈ �ν��Ͻ� ����


// .env ���Ͽ��� ȯ�� ���� ��������
const projectId = 'newagent-dqie';
const sessionId = 'my-static-session';
const languageCode = 'en';

// sessionPath ���� (projectAgentSessionPath�� ����)
const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
console.log(projectId, sessionId, languageCode);  // ȯ�� ���� �� ��� Ȯ��

// Text Query Route
router.post('/textQuery', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: req.body.text,  // body-parser ��� ���
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API ȣ��
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // ��� ����
    } catch (error) {
        console.error('Error detecting intent:', error);
        res.status(500).send('Error detecting intent');
    }
});

// Event Query Route
router.post('/eventQuery', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            event: {
                name: req.body.event,
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API ȣ��
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // ��� ����
    } catch (error) {
        console.error('Error detecting intent:', error);
        res.status(500).send('Error detecting intent');
    }
});

module.exports = router;
