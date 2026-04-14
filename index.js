const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();

// 已帮你填写完成，无需修改
const CONFIG = {
  corpid: "wx334419e82704ef5b",
  secret: "ngCZpaifpEcYB-2WVfmHRHOXfl2iKBBNfv2hrXpSVm8",
  token: "WeCom2FA2026"
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let accessToken = "";
let expireTime = 0;

function checkSignature(token, timestamp, nonce, signature) {
  const arr = [token, timestamp, nonce].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === signature;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && now < expireTime) return accessToken;
  const res = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CONFIG.corpid}&corpsecret=${CONFIG.secret}`);
  if (res.data.errcode === 0) {
​    accessToken = res.data.access_token;
​    expireTime = now + res.data.expires_in - 120;
  }
  return accessToken;
}

app.get('/corp/2fa', async (req, res) => {
  const { msg_signature, timestamp, nonce, echostr, code } = req.query;
  if (echostr) {
​    if (checkSignature(CONFIG.token, timestamp, nonce, msg_signature)) {
​      return res.send(echostr);
​    }
​    return res.send("校验失败");
  }
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>企业微信二次验证</title>
    <style>
      .box{margin-top:80px;text-align:center;}
      input{padding:10px;width:220px;font-size:16px;border-radius:6px;border:1px solid #ccc;}
      button{padding:10px 30px;background:#0088ff;color:#fff;border:none;border-radius:6px;margin-top:20px;font-size:16px;}
    </style>
  </head>
  <body>
    <div class="box">
      <h2>企业登录安全验证</h2>
      <p>请输入验证码：<strong>123456</strong></p>
      <form method="POST">
        <input type="hidden" name="code" value="${code}">
        <input type="text" name="codeInput" placeholder="填写6位验证码" required>
        <br/>
        <button type="submit">提交验证</button>
      </form>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

app.post('/corp/2fa', async (req, res) => {
  const { code, codeInput } = req.body;
  try {
​    const token = await getAccessToken();
​    const userRes = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${token}&code=${code}`);
​    if (userRes.data.errcode !== 0) {
​      return res.send("<h3>登录凭证失效，请重新打开企业微信</h3>");
​    }
​    const userId = userRes.data.UserId;
​    if (codeInput !== "123456") {
​      return res.send("<h3>验证码错误，请重试</h3><a href='javascript:history.back()'>返回</a>");
​    }
​    await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/authsucc?access_token=${token}&userid=${userId}`);
​    return res.send(`<script>alert('验证成功，已正常登录！');window.close();</script>`);
  } catch (err) {
​    return res.send("<h3>系统异常，请联系管理员</h3>");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("服务运行正常");
});