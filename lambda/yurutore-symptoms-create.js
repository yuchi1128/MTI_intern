const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const crypto = require('crypto');

const client = new DynamoDBClient({ region: "ap-northeast-1" });
const TableName = "team2_user_symptoms";

// 固定の認証トークン
const VALID_TOKEN = "mtiToken";

// UUIDを生成する関数
const generateSymptomId = () => crypto.randomUUID();

exports.handler = async (event, context) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "" }),
  };

  // ヘッダーからトークンを取得
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${VALID_TOKEN}`) {
    response.statusCode = 401;
    response.body = JSON.stringify({
      message: "認証トークンが無効です。",
    });
    return response;
  }

  // リクエストボディのパース
  const body = event.body ? JSON.parse(event.body) : null;
  if (!body || !body.user_id || !body.SymptomDetails) {
      response.statusCode = 400;
      response.body = JSON.stringify({ message: "無効なリクエストです。必須フィールドが不足しています。" });
      return response;
  }

  // SymptomIdを自動生成
  const { user_id, SymptomDetails = [] } = body;
  const SymptomId = generateSymptomId();

  const param = {
      TableName,
      Item: marshall({
          user_id: user_id,
          SymptomId: SymptomId,
          SymptomDetails: SymptomDetails,
      }),
  };

  const command = new PutItemCommand(param);

  try {
      await client.send(command);
      response.body = JSON.stringify({ message: "症状の記録が正常に保存されました。", SymptomId: SymptomId});
      
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "症状の保存に失敗しました。",
      errorDetail: e.toString(),
    });
  }

  return response;
};
