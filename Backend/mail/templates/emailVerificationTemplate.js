const otpTemplate = (otp) => {
	return `<!DOCTYPE html>
	<html>
	
	<head>
		<meta charset="UTF-8">
		<title>OTP Verification Email</title>
		<style>
			body {
				background-color: #ffffff;
				font-family: Arial, sans-serif;
				font-size: 16px;
				line-height: 1.4;
				color: #333333;
				margin: 0;
				padding: 0;
			}
	
			.container {
				max-width: 600px;
				margin: 0 auto;
				padding: 20px;
				text-align: center;
			}
	
			.logo {
				max-width: 200px;
				margin-bottom: 20px;
			}
	
			.message {
				font-size: 18px;
				font-weight: bold;
				margin-bottom: 20px;
			}
	
			.body {
				font-size: 16px;
				margin-bottom: 20px;
			}
	
			.cta {
				display: inline-block;
				padding: 10px 20px;
				background-color: #FFD60A;
				color: #000000;
				text-decoration: none;
				border-radius: 5px;
				font-size: 16px;
				font-weight: bold;
				margin-top: 20px;
			}
	
			.support {
				font-size: 14px;
				color: #999999;
				margin-top: 20px;
			}
	
			.highlight {
				font-weight: bold;
			}
		</style>
	
	</head>
	
	<body>
		<div class="container">
			<a href="https://www.google.com/search?sca_esv=3e6e675139b39849&rlz=1C1CHZN_en&sxsrf=AHTn8zrc3rTx_lmQ5ClTU9qF6sBEzuvzvg:1745094760312&q=aref+pic+link&udm=2&fbs=ABzOT_CWdhQLP1FcmU5B0fn3xuWpA-dk4wpBWOGsoR7DG5zJBkzPWUS0OtApxR2914vrjk7XZXfnfKsaRZouQANLhmphNyg6d7jx9WIegRytfuMfNwBSLAX8WsvrJKa122pJHULT0QMGk7davBushgHE-NJ8R4p9DV6GYGihF5A7HWiF02GLdfHfWuN_Ee3mbhYmzxvktglrZPO0v8t1dJNtsIfjcKjBYw&sa=X&ved=2ahUKEwj8wabK-OSMAxXMcfUHHbxeKGsQtKgLegQIFRAB&biw=1280&bih=631&dpr=1.5#vhid=1-MLMOrLcLBHqM&vssid=mosaic"><img class="logo"
					src="https://i.ibb.co/7Xyj3PC/logo.png" alt="OTP verification logo"></a>
			<div class="message">OTP Verification Email</div>
			<div class="body">
				<p>Dear User,</p>
				<p>Thank you for registering with ClassConnect. To complete your registration, please use the following OTP
					(One-Time Password) to verify your account:</p>
				<h2 class="highlight">${otp}</h2>
				<p>This OTP is valid for 5 minutes. If you did not request this verification, please disregard this email.
				Once your account is verified, you will have access to our platform and its features.</p>
			</div>
			<div class="support">If you have any questions or need assistance, please feel free to reach out to us at <a
					href="mailto:info@studynotion.com">info@studynotion.com</a>. We are here to help!</div>
		</div>
	</body>
	
	</html>`;
};
export default otpTemplate;
