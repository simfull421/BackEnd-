require('dotenv').config();
const express = require('express');
const router = express.Router();
const { SessionsClient } = require('@google-cloud/dialogflow');  // @google-cloud/dialogflow에서 SessionsClient 가져오기
const sessionClient = new SessionsClient();  // 클라이언트 인스턴스 생성


// .env 파일에서 환경 변수 가져오기
const projectId = 'newagent-dqie';
const sessionId = 'my-static-session';
const languageCode = 'en';

// sessionPath 생성 (projectAgentSessionPath로 수정)
const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
console.log(projectId, sessionId, languageCode);  // 환경 변수 값 출력 확인

// Text Query Route
router.post('/textQuery', async (req, res) => {
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: req.body.text,  // body-parser 모듈 사용
                languageCode: languageCode,
            },
        },
    };

    try {
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API 호출
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // 결과 응답
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
        const responses = await sessionClient.detectIntent(request);  // Dialogflow API 호출
        console.log('Detected intent');
        const result = responses[0].queryResult;
        console.log(`Query: ${result.queryText}`);
        console.log(`Response: ${result.fulfillmentText}`);

        res.send(result);  // 결과 응답
    } catch (error) {
        console.error('Error detecting intent:', error);
        res.status(500).send('Error detecting intent');
    }
});

module.exports = router;
