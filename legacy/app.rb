#!/usr/bin/env ruby  

class UPFlow < Shoes
	url "/", :mainscreen
		
	def mainscreen
	
		# App Menu
	
		mb = menubar
		helpmenu = menu "Help"
		@apiitem = menuitem "Set API Key" do
			window :title => "UP Flow - Set API Key", height: 140 do

				font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

				stack margin_top: 20, margin_left: 13 do
					@enter_api_key = edit_line "", :width => 570
					@enter_api_key.text = @@decrypt_api_key_final
				end

				stack margin_top: 5, margin_bottom: 5, margin_left: 12 do 
					@p_info = para ""
				end

				stack margin_left: 13 do
					flow do
						button "Save", stroke: purple, tooltip: "Save API Key" do
							Thread.new do
								@p_info.text = "Saving key, please wait..."
								@p_info.stroke = blue
								@api_key = @enter_api_key.text
								i = @api_key
								extract = 0
								newstring = ""
								while extract < i.length
									a = i[extract].ord
									b = @@crypt_final[a].to_s
									newstring = newstring + b
									extract = extract + 1
								end
								if @enter_api_key.text.include? ""
									@api_key = newstring
								end
								@p_info.text = "Using secret key and scrambling content, please wait..."
								final_shuffle =  newstring.to_i * @@crypt_final[129].to_i
								final_encrypt = final_shuffle.to_s.reverse
								File.open("assets/keys/api.txt", "w+") do |encrypt|
									encrypt.write "#{final_encrypt}"
								end
								if @enter_api_key.text() == "0"
									@p_info.text = "Error!"
									@p_info.stroke = red
									error "UP Flow - Set API Key : #{@p_info}"
								else 
									@p_info.text = "Successfully completed!!!"
									@p_info.stroke = green
									info "Encrypted and Saved API Key successfully!"
								end
							end
						end

						para "  "
						button "Copy", tooltip: "Copy content in text-box to clipboard" do 
							self.clipboard = "#{@enter_api_key.text}"
							@p_info.text = "Current content copied to clipboard!"
							@p_info.stroke = blue
						end
						para "  "
						button "Paste", tooltip: "Paste content in clipboard to text-box" do
							@enter_api_key.text = clipboard()
							@p_info.text = "Current clipboard content has been pasted!"
							@p_info.stroke = blue
						end
						para "  "
						button "Clear", tooltip: "Clear saved user API" do
							@enter_api_key.text = "0"
							File.open("assets/keys/api.txt", "w+") {|clear_api| clear_api.truncate(0)}
							if confirm "Done!\n\nPlease restart UP Flow for the changes to take effect!\n\nProceed?", title: "Task Completed"
								Shoes.quit()
							end
						end
						para "  "
						button "Run", tooltip: "Force run launch scripts" do

							Thread.new do
								# Load crypt.gkey after launch

								@p_info.text = "Loading crypt.gkey..."
								@p_info.stroke = blue

								require 'fileutils'
								FileUtils.cp("assets/keys/crypt.gkey", "assets/temp/crypt.rb")
								require "assets/temp/crypt"
								@@crypt_final = Crypt.class_variable_get(:@@cypher_bak)
								File.open("assets/temp/crypt.rb", "w") {|clear_temp_crypt| clear_temp_crypt.truncate(0)}
								info "Loaded constants from temp files!"

								# Decrypt API Key

								@p_info.text = "Decrypting API Key..."

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

								@p_info.text = "Saving account information locally..."

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

								# Save transaction information locally

								@p_info.text = "Saving transaction information locally..."

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

								@p_info.text = "All done! Please click the quit button to close the app."
								@p_info.stroke = green
							end
						end
						para "  "
						button "Quit", stroke: red, tooltip: "Close the UP Flow app" do
							Shoes.quit()
						end
					end
				end

			end
		end
		helpmenu << @apiitem
		@licenseitem =  menuitem "View License" do
			alert "Copyright (c) 2020 JDsnyke\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.", title: "MIT License"
		end
		helpmenu << @licenseitem
		updateseperator = menuitem "---"
		helpmenu << updateseperator
		@updateitem =  menuitem "Check for Updates", key: "control_u" do
			current_dir = Dir.pwd
			system "start #{current_dir}/updater.exe"
		end
		helpmenu << @updateitem
		@repoitem = menuitem "Visit Repo" do
			repolink = "https://www.github.com/JDsnyke/UP-Flow"
			system "start #{repolink}"
		end
		helpmenu << @repoitem
		aboutseperator = menuitem "---"
		helpmenu << aboutseperator
		@aboutitem =  menuitem "About", key: "control_i" do
			current_ver = File.read("assets/version/current.ver")
			alert "Version : #{current_ver}\n\nRuby Version : #{RUBY_VERSION}\n\nShoes Version : #{Shoes::VERSION_NUMBER} - r#{Shoes::VERSION_REVISION}\n\nAuthors : JDsnyke", title: "About"
		end
		helpmenu << @aboutitem
		mb << helpmenu
		
		require 'assets/engine'
		require 'digest'
		require 'json'

		# Body
		background "#262330"

		font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

		account_json_file = IO.read("assets/data/accounts.json")
		my_accounts = JSON.parse(account_json_file)
		transaction_json_file = IO.read("assets/data/transactions.json")
		my_transactions = JSON.parse(transaction_json_file)
		sav_bal = my_accounts["data"][1..-1].sum { |bal| bal["attributes"]["balance"]["value"].to_f }

		stack :margin_top => "40", :margin_left => "20"  do
			title "$#{my_accounts["data"][0]["attributes"]["balance"]["value"]} AUD", align: "center", stroke: "#F97C68"
			para "Transactional Balance", align: "center", stroke: "#F5F3F9"
		end

		stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
			title "$#{sav_bal} AUD", align: "center", stroke: "#F97C68"
			para "Savings Balance", align: "center", stroke: "#F5F3F9"
		end

		my_accounts["data"].each do |list_s|
			stack :margin_top => "30", :margin_left => "380" do
				account_value = list_s["attributes"]["balance"]["value"]
				button "#{list_s["attributes"]["displayName"]} : $#{account_value} AUD", width:680, height: 68 do
					window :title => "UP Flow - #{list_s["attributes"]["displayName"]}" do
						
						background "#262330"

						font "fonts/Circular.ttf" unless Shoes::FONTS.include?('Circular')

						description = []
						value = []
						date = []

						my_transactions["data"].each do |list_t|
							description << list_t["attributes"]["description"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							value << list_t["attributes"]["amount"]["value"].to_f if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
							date << list_t["attributes"]["createdAt"] if list_t["relationships"]["account"]["data"]["id"] == "#{list_s["id"]}"
						end

						stack :margin_top => "20", :margin_bottom => "10", :margin_left => "20" do
							title "$#{account_value} AUD", align: "center", stroke: "#F97C68"
							para "Current Balance", align: "center", stroke: "#F5F3F9"
						end
						
						date.each do |list_d|
							d = DateTime.parse("#{list_d}")
							value.each do |list_c|
								description.each do |list_b|
									stack :margin_top => "30", :margin_left => "38", :margin_right => "35" do
										background "#F5F3F9"
										para "#{list_b}", align: "center", size: "x-large", weight: "light"
										para "$ #{list_c} AUD", align: "center", size: "large"
										para "#{d.strftime('%d %b %Y at %I:%M %p')}", align: "center"
									end
								end
							end
						end
					
						stack :margin_bottom => "50" do	end

					end
				end
				stack :margin_bottom => "40" do	end
			end
		end
	end
end

Shoes.app :title => "UP Flow", width: 1400, height: 900, menus: true