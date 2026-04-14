const axios = require('axios');
const crypto = require('crypto');

// ******** 已帮你填好，无需修改 ********
const CONFIG = {
  corpid: "wx334419e82704ef5b",
  secret: "ngCZpaifpEcYB-2WfvmHRHOXf12iKBBNfv2hrXpSVm8",
  token: "WeCom2FA2026"
};
// ******************************************

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
    accessToken = res.data.access_token;
    expireTime = now + res.data.expires_in - 120;
  }
  return accessToken;
}

module.exports = async (req, res) => {
  const { method, query, body } = req;

  // 1. 企业微信URL校验
  if (method === 'GET') {
    const { msg_signature, timestamp, nonce, echostr, code } = query;
    
    if (echostr) {
      if (checkSignature(CONFIG.token, timestamp, nonce, msg_signature)) {
        return res.send(echostr);
      }
      return res.status(403).send("校验失败");
    }

    // 展示验证页面
    if (!code) return res.status(400).send("缺少登录凭证");
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>企业验证</title>
      <style>body{text-align:center;margin-top:100px;}input{padding:10px;width:220px;}button{padding:10px 30px;background:#0066CC;color:#fff;border:none;margin-top:20px;cursor:pointer;}</style>
    </head>
    <body>
      <h3>企业登录二次验证</h3>
      <p>验证码：<strong>123456</strong></p>
      <form method="POST">
        <input type="hidden" name="code" value="${code}">
        <input type="text" name="codeInput" placeholder="请输入6位验证码" required>
        <br><button type="submit">提交</button>
      </form>
    </body>
    </html>`;
    return res.send(html);
  }

  // 2. 处理验证提交
  if (method === 'POST') {
    const { code } = query;
    const { codeInput } = body;
    
    if (codeInput !== "123456") {
      return res.send("<h3>验证码错误，请重试</h3><a href='javascript:history.back()'>返回</a>");
    }

    const token = await getAccessToken();
    const userRes = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${token}&code=${code}`);
    const userId = userRes.data.UserId;

    await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/authsucc?access_token=${token}&userid=${userId}`);
    res.send("<script>alert('验证成功！');window.close();</script>");
  }
};