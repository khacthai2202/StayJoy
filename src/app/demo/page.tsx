'use client'

import { useEffect } from 'react'

export default function DemoPage() {
  useEffect(() => {
    // Add Chatwoot Settings
    window.chatwootSettings = {
      hideMessageBubble: false,
      position: 'right', 
      locale: 'vi', 
      type: 'standard',
    };

    // Load Chatwoot Script
    (function(d,t) {
      var BASE_URL="https://chat.stayjoy.io.vn";
      var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
      g.src=BASE_URL+"/packs/js/sdk.js";
      g.defer = true;
      g.async = true;
      s.parentNode.insertBefore(g,s);
      g.onload=function(){
        window.chatwootSDK.run({
          websiteToken: '2wZuhVzmJbTPT9FSaxmZoVYi',
          baseUrl: BASE_URL
        })
      }
    })(document,"script");
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Image */}
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070&auto=format&fit=crop')" }}>
          <div className="w-full h-full bg-black/40 flex items-end p-6">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">
              Annie's Little Hanoi
            </h1>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center">
            Chào mừng bạn đến với trang Demo Trải nghiệm Lễ tân AI của StayJoy.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Hướng dẫn test AI:</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-2">
              <li>Bấm vào biểu tượng Chat màu xanh ở góc phải bên dưới màn hình.</li>
              <li>Bạn có thể hỏi giá phòng, địa chỉ, tiện nghi, hoặc yêu cầu xem ảnh phòng.</li>
              <li>AI đã được cung cấp thông tin thực tế của Homestay Annie's Little Hanoi để trả lời bạn.</li>
            </ul>
          </div>
          
          <p className="text-xs text-gray-400 text-center pt-4">
            Powered by StayJoy AI
          </p>
        </div>
      </div>
    </div>
  )
}
