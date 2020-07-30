require 'net/http'
require 'uri'
require 'json'
require 'openssl'

# Decrepitated shoes ver warning

intalled_shoes_ver = "#{Shoes::VERSION_NUMBER}"
app_shoes_ver = "3.3.8"

if installed_shoes_ver =! app_shoes_ver
    info "Currently running outdated version of Shoes 3"
    if confirm "An old version of Shoes had been detected.\n\nUP Flow requires Shoes - #{app_shoes_ver} to run properly.\n\nVisit download page?\n", title: "Decrepitated Warning"
        system "start https://walkabout.mvmanila.com/downloads/windows-downloads/"
        info "Launched link to latest shoes binary in the browser!"
    end
end

# Load crypt.gkey after launch

require 'fileutils'
FileUtils.cp("assets/keys/crypt.gkey", "assets/temp/crypt.rb")
require "assets/temp/crypt"
@@crypt_final = Crypt.class_variable_get(:@@cypher_bak)
File.open("assets/temp/crypt.rb", "w") {|clear_temp_crypt| clear_temp_crypt.truncate(0)}
info "Loaded constants from temp files!"

# Decrypt API Key

@@decrypt_api_file = File.read("assets/keys/api.txt")
@decrypt_api_file_conv = @@decrypt_api_file
@decrypt_api_file_conv2 = @decrypt_api_file_conv.reverse
@decrypt_api_file_conv3 =  @decrypt_api_file_conv2.to_i / @@crypt_final[129].to_i
@decrypt_api_key = @decrypt_api_file_conv3.to_s
if @decrypt_api_key.include? ""
    @decrypt_api_key.gsub! @@crypt_final[0], "0"
    u = 0
    while u <= 128
        @decrypt_api_key.gsub! @@crypt_final[u], u.chr	
        u = u + 1
    end
end
@@decrypt_api_key_final = @decrypt_api_key.to_s
info "Decrypted the API Key!"

# Save account information locally

acc_header = "Bearer #{@@decrypt_api_key_final}"
acc_url = URI("https://api.up.com.au/api/v1/accounts")

acc_http = Net::HTTP.new(acc_url.host, acc_url.port)
acc_http.use_ssl = true
acc_http.verify_mode = OpenSSL::SSL::VERIFY_NONE

acc_request = Net::HTTP::Get.new(acc_url)
acc_request["Authorization"] = "#{acc_header}"
@@acc_response = acc_http.request(acc_request)

File.open("assets/data/accounts.json", "w+") do |save|
    save.write "#{@@acc_response.read_body}"
    info "Saved account information!"
end

# Save account information locally

transc_header = "Bearer #{@@decrypt_api_key_final}"
transc_url = URI("https://api.up.com.au/api/v1/transactions")

transc_http = Net::HTTP.new(transc_url.host, transc_url.port)
transc_http.use_ssl = true
transc_http.verify_mode = OpenSSL::SSL::VERIFY_NONE

transc_request = Net::HTTP::Get.new(transc_url)
transc_request["Authorization"] = "#{transc_header}"

@@transc_response = transc_http.request(transc_request)

File.open("assets/data/transactions.json", "w+") do |save|
    save.write "#{@@transc_response.read_body}"
    info "Saved transaction information!"
end