---
layout:       post
title:        "使用任意语言开发通达信公式"
author:       "谢慕安"
header-style: text
catalog:      true
tags:
    - 谢慕安
    - 通达信
    - 中年人学炒股
---

通达信通过HTTP扩展实现任意语言开发公式。

## 前言

[官方网站：缠中说禅博客互联网永存计划](chzhshch.org)

### 下载地址

[通达信使用任意语言开发公式——tdx_http_dll](https://download.chzhshch.org/tdx_http_dll_20240727.zip)


### 为什么不开源？

国内开源会被恶意商业化的例子太多了，最近把旧的`Kindle`刷成`Android`系统就中招了。

原来有大佬是开源、免费的。结果有人拿去改改，加入了收费激活的功能，导致原先的大佬不开源了，并撤回了当初共享的文件。

结果，就使得后来者无法再免费享受到好处了。



## 原理

[![](/img/in-post/20240727-architecture.png){:data-lightbox="image-1" data-title=""}](/img/in-post/20240727-architecture.png)



利用通达信可以支持`dll`公式，把通达信公式脚本中的数据，通过`tdx_http_dll`转发到由任意语言开发的http服务上，并在该服务上计算结果，通过http响应返回给`tdx_http_dll`，从而实现可以用任意语言开发通达信的公式，而不局限于使用`C++`。



## 通信协议

采用HTTP POST请求，消息体是`protobuf`编码的数据，请求和响应的`Content-Type`字段是`application/x-protobuf`。



### 通达信公式

```
RESULT:=TDXDLL1(1, v1, v2, v3);
```



通达信公式实际提供了3个参数可以传递给公式，也就是上述代码中的`v1`、`v2`和`v3`，可以是通达信内置提供的数据，比如：开盘价、收盘价之类的（`OPEN`、`CLOSE`）。



然后，传递给代码层面的时候，会把对应的参数变成一个数组，也就是说，代码可以接收三个数组（通达信公式里的数据）。



最后，只能返回一组数据给通达信公式，也就是说，代码层面只能返回一个数组。



### proto定义

```protobuf
// 通达信公式dll 和 http服务器之间的通信协议

syntax = "proto3";

package tdx_http_proto;

option java_package = "com.tdx.http";
option java_outer_classname = "TdxHttpProto";

// 公式传递股票数据的消息体
message StockDataReq {
  repeated float val_arr1 = 1;
  repeated float val_arr2 = 2;
  repeated float val_arr3 = 3;
}

// 脚本计算结果返回的消息体
message StockDataResp {
  repeated float result_arr = 1;
}

```



## http服务

公式计算服务，必须监听在`localhost:8888`，提供路径为`/script`的`POST`接口。

也就是说`tdx_http_dll`会发送HTTP的POST请求到`http://localhost:8888/script`，消息体为proto定义中的`StockDataReq`。

http服务，进行对应的计算后，需要返回`200 OK`的响应，消息体为proto定义中的`StockDataResp`。



## 示例

假设，我们传递开盘价和收盘价给HTTP计算服务，该服务返回今天是阳线还是阴线（请不要纠结这个功能用通达信内置公式语言也能实现，这里只是举一个例子）



### 通达信侧

在绑定好`tdx_http_dll`之后，新建一个公式，如下图所示：

[![](/img/in-post/20240727-example1.png){:data-lightbox="image-1" data-title=""}](/img/in-post/20240727-example1.png)



具体代码为：

`RORG:TDXDLL1(1, OPEN, CLOSE, 0), COLORSTICK;`

表示，第一个参数是`开盘价`，第二个参数是`收盘价`，第三个参数为0，传递给http服务；返回的结果是`RORG`，最后的`COLORSTICK`表示用红绿柱子来绘制结果。



### http服务侧

可以用任意语言实现，本示例选择用`Node.js`来实现对应的http服务。



```javascript
// ...... 省略前面的http消息体处理

// 解码二进制数据
const pbReq = stockDataReq.decode(uint8Array);
console.log('pbReq:', pbReq)
const {valArr1, valArr2, valArr3} = pbReq;

// 公式计算
const rspObj = {
	resultArr: [],
}
for (let i = 0; i < valArr1.length; i++) {
    const open = valArr1[i]
    const close = valArr2[i]
    rspObj.resultArr.push(close >= open ? 1 : -1)
}
console.log('rspObj:', rspObj)

// 返回运算结果
const pbRsp = stockDataRsp.create(rspObj)
const rspBuff = stockDataRsp.encode(pbRsp).finish()
return new Response(rspBuff, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-protobuf',
    },
})
```



### 最终效果

[![](/img/in-post/20240727-example2.png){:data-lightbox="image-1" data-title=""}](/img/in-post/20240727-example2.png)



## 注意事项

### 日志文件

`tdx_http_dll`的日志文件，会生成在通达信放置`dll`公式的目录下（`T0002\dlls`），文件名是`111-tdx-http-script.log`（日志文件会自动滚动记录）。



### 不同语言，浮点型处理可能有偏差

建议转换为整型处理

**浮点型转换成无符号整型的最大有效值是：16777216**
